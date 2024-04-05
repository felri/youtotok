// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use reqwest::multipart;
use rusty_ytdl::{Video, VideoOptions, VideoQuality, VideoSearchOptions};
use serde_json::{Map, Value};
use std::process::Command;
#[derive(Debug, serde::Deserialize)]
struct Timing {
    start: f32,
    end: f32,
}

fn convert_to_vtt(json_data: &Value, subtitle_type: &str) -> String {
    println!("Converting to VTT...");
    let mut vtt_content = String::new();
    vtt_content.push_str("WEBVTT\n\n");

    let words = json_data.get(subtitle_type).and_then(Value::as_array);

    println!("words: {:?}", words);

    if let Some(words) = words {
        let mut start_time = 0.0;
        let mut end_time = 0.0;
        let mut subtitle = String::new();

        println!("Subtitle Type: {}", subtitle_type);
        println!("Words: {:?}", words);
        for word in words {
            if let Some(word_map) = word.as_object() {
                println!("Word Map: {:?}", word_map);
                let word_text = word_map
                    .get("word")
                    .or_else(|| word_map.get("text"))
                    .and_then(Value::as_str)
                    .unwrap_or("");
                start_time = word_map.get("start").and_then(Value::as_f64).unwrap_or(0.0);
                end_time = word_map.get("end").and_then(Value::as_f64).unwrap_or(0.0);

                // Skip if word_text is empty or contains only spaces
                if word_text.trim().is_empty() {
                    continue;
                }

                subtitle.push_str(word_text);
                subtitle.push(' ');

                let start_time_str = format_time(start_time);
                let end_time_str = format_time(end_time);

                vtt_content.push_str(&format!(
                    "{} --> {}\n{}\n\n",
                    start_time_str, end_time_str, subtitle
                ));
                subtitle.clear();
            }
        }
    }

    vtt_content
}

fn format_time(time: f64) -> String {
    let hours = (time / 3600.0) as u64;
    let minutes = ((time / 60.0) % 60.0) as u64;
    let seconds = (time % 60.0) as u64;
    let milliseconds = ((time * 1000.0) % 1000.0) as u64;

    format!(
        "{:02}:{:02}:{:02}.{:03}",
        hours, minutes, seconds, milliseconds
    )
}

async fn extract_audio(video_id: String, audio_format: String) -> Result<String, String> {
    let input = format!("../public/{}_trimmed.mp4", video_id);
    let output = format!("../public/{}.{}", video_id, audio_format);

    println!("Input: {}", input);
    println!("Output: {}", output);

    let output = Command::new("ffmpeg")
        .args(&[
            "-y",
            "-i",
            &input,
            "-vn",
            "-acodec",
            if audio_format == "mp3" {
                "libmp3lame"
            } else {
                "aac"
            },
            &output,
        ])
        .output()
        .expect("failed to execute process");

    let output = String::from_utf8_lossy(&output.stdout);

    println!("FFmpeg Output: {}", output);

    Ok(output.to_string())
}

#[tauri::command]
async fn transcribe_audio(video_id: &str, api_key: &str) -> Result<String, String> {
    println!("Transcribing audio...");
    println!("Video ID: {}", video_id);
    println!("API Key: {}", api_key);

    let file_part = reqwest::multipart::Part::bytes(
        std::fs::read(format!("../public/{}.mp3", video_id)).unwrap(),
    )
    .file_name("file")
    .mime_str("audio/mp3")
    .unwrap();

    let timestamp_granularities = vec!["word", "segment"];

    let mut form = multipart::Form::new()
        .part("file", file_part)
        .text("response_format", "verbose_json")
        .text("language", "en")
        .text("model", "whisper-1");

    for granularity in timestamp_granularities {
        form = form.text("timestamp_granularities[]", granularity);
    }

    let client = reqwest::Client::new();
    let res = client
        .post("https://api.openai.com/v1/audio/transcriptions")
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await
        .unwrap();

    let res = res.text().await.unwrap();
    let json_data: Value = serde_json::from_str(&res).unwrap();

    let vtt_words = convert_to_vtt(&json_data, "words");
    let vtt_segments = convert_to_vtt(&json_data, "segments");

    std::fs::write(format!("../public/{}.vtt", video_id), vtt_segments).unwrap();
    std::fs::write(format!("../public/{}_words.vtt", video_id), vtt_words).unwrap();

    Ok(res)
}

#[tauri::command]
async fn trim_video(video_id: String, timings: Vec<Timing>) -> Result<String, String> {
    let input = format!("../public/{}.mp4", video_id);
    let output = format!("../public/{}_trimmed.mp4", video_id);

    let mut filters = Vec::new();
    let mut filter_complex = String::new();

    for (i, timing) in timings.iter().enumerate() {
        let filter = format!(
            "[0:v]trim=start={}:end={},setpts=PTS-STARTPTS[v{}];[0:a]atrim=start={}:end={},asetpts=PTS-STARTPTS[a{}];",
            timing.start,
            timing.end,
            i,
            timing.start,
            timing.end,
            i
        );

        filters.push(format!("[v{}][a{}]", i, i));
        filter_complex.push_str(&filter);
    }

    filter_complex.push_str(&format!(
        "{}concat=n={}:v=1:a=1[outv][outa]",
        filters.join(""),
        timings.len()
    ));

    let output = Command::new("ffmpeg")
        .args(&[
            "-y",
            "-i",
            &input,
            "-filter_complex",
            &filter_complex,
            "-map",
            "[outv]",
            "-map",
            "[outa]",
            &output,
        ])
        .output()
        .expect("failed to execute process");

    let output = String::from_utf8_lossy(&output.stdout);

    println!("FFmpeg Output: {}", output);

    // extract audio
    let audio_format = "mp3";
    extract_audio(video_id.clone(), audio_format.to_string())
        .await
        .unwrap();

    Ok(output.to_string())
}

#[tauri::command]
async fn download_youtube_video(url: String) -> Result<String, String> {
    let video_options = VideoOptions {
        quality: VideoQuality::Highest,
        filter: VideoSearchOptions::VideoAudio,
        ..Default::default()
    };

    let video = Video::new_with_options(url, video_options).unwrap();

    let video_info = video.get_info().await.unwrap();

    let video_id = video_info.video_details.video_id;

    let path = std::path::Path::new("../public")
        .join(&video_id)
        .with_extension("mp4");

    if path.exists() {
        return Ok(video_id);
    }

    video.download(path).await.unwrap();

    Ok(video_id)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            download_youtube_video,
            trim_video,
            transcribe_audio
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
