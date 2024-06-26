// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use reqwest::multipart;
use rsubs_lib::vtt;
use rusty_ytdl::{Video, VideoOptions, VideoQuality, VideoSearchOptions};
use serde_json::Value;
use std::io::{self, BufRead};
use std::{fs, io::BufReader, path::Path, process::Command}; // Import the BufRead trait
use tokio::fs as tokio_fs;
use uuid::Uuid;

#[derive(Debug, serde::Deserialize)]
struct Timing {
    start: f32,
    end: f32,
}

#[derive(Debug, serde::Deserialize)]
struct Dimensions {
    width: f32,
    height: f32,
    x: f32,
    y: f32,
}

fn convert_to_vtt(json_data: &Value, subtitle_type: &str) -> String {
    let mut vtt_content = String::new();
    vtt_content.push_str("WEBVTT\n\n");

    let words = json_data.get(subtitle_type).and_then(Value::as_array);

    if let Some(words) = words {
        let mut start_time = 0.0;
        let mut end_time = 0.0;
        let mut subtitle = String::new();
        let mut word_count = 0;

        for word in words {
            if let Some(word_map) = word.as_object() {
                let segment_text = word_map
                    .get("word")
                    .or_else(|| word_map.get("text"))
                    .and_then(Value::as_str)
                    .unwrap_or("");
                start_time = word_map.get("start").and_then(Value::as_f64).unwrap_or(0.0);
                end_time = word_map.get("end").and_then(Value::as_f64).unwrap_or(0.0);

                if segment_text.trim().is_empty() {
                    continue;
                }

                for word_text in segment_text.split_whitespace() {
                    subtitle.push_str(word_text);
                    word_count += 1;

                    if word_count % 3 == 0 {
                        subtitle.push_str("\n");
                    } else {
                        subtitle.push(' ');
                    }
                }

                let start_time_str = format_time(start_time);
                let end_time_str = format_time(end_time);

                vtt_content.push_str(&format!(
                    "{} --> {}\n{}\n\n",
                    start_time_str, end_time_str, subtitle.trim_end()
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

    Ok(output.to_string())
}

fn remove_subtitles(video_id: &str) {
    let paths = vec![
        format!("../public/{}.vtt", video_id),
        format!("../public/{}_words.vtt", video_id),
        format!("../public/{}_3words.vtt", video_id),
        format!("../public/{}_4words.vtt", video_id),
        format!("../public/{}_segments.vtt", video_id),
        format!("../public/{}_pixel.vtt", video_id),
    ];

    for path in paths {
        if let Err(e) = fs::remove_file(&path) {
            println!("Error removing file: {}", e);
        }
    }
}

fn condense_subtitle(subtitle_text: &str, words_per_line: usize) -> Vec<String> {
    let mut lines = subtitle_text.lines();
    let mut condensed_lines: Vec<String> = Vec::new();
    let mut current_line: Vec<String> = Vec::new();
    let mut start_time = String::new();
    let mut end_time = String::new();
    let mut text_on_next_line = false;

    // Add "WEBVTT" without changes if present
    if let Some(first_line) = lines.next() {
        if first_line.trim() == "WEBVTT" {
            condensed_lines.push(first_line.to_owned());
            condensed_lines.push("".to_owned());
            // Ignore the following empty line after "WEBVTT"
            lines.next();
        }
    }

    for line in lines {
        if text_on_next_line {
            current_line.push(line.trim().to_owned());
            text_on_next_line = false;
            continue;
        }

        if line.trim().is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            // Assuming the line is a timestamp line
            if current_line.len() >= words_per_line {
                let formatted_text = insert_line_breaks(&current_line, 3);
                condensed_lines.push(format!("{} --> {}", start_time, end_time));
                condensed_lines.push(formatted_text);
                condensed_lines.push("".to_owned());
                current_line.clear();
            }

            if current_line.is_empty() {
                start_time = parts[0].to_owned();
            }
            end_time = parts[2].to_owned();
            text_on_next_line = true;
        }
    }

    // Handle any remaining text
    if !current_line.is_empty() {
        let formatted_text = insert_line_breaks(&current_line, 3);
        condensed_lines.push(format!("{} --> {}", start_time, end_time));
        condensed_lines.push(formatted_text);
    }

    condensed_lines
}

// Helper function to insert line breaks every `n` words
fn insert_line_breaks(words: &[String], n: usize) -> String {
    words.chunks(n).map(|chunk| chunk.join(" ")).collect::<Vec<_>>().join(" \n")
}

#[tauri::command]
async fn transcribe_audio(video_id: &str, api_key: &str, language: &str) -> Result<(), String> {
    println!("Transcribing audio...");
    remove_subtitles(video_id);

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
        .text("language", language.to_lowercase())
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
    let vtt_3_words = condense_subtitle(&vtt_words, 3).join("\n");
    let vtt_4_words: String = condense_subtitle(&vtt_words, 4).join("\n");
    let vtt_5_words: String = condense_subtitle(&vtt_words, 5).join("\n");
    let vtt_6_words: String = condense_subtitle(&vtt_words, 6).join("\n");

    std::fs::write(format!("../public/{}.vtt", video_id), vtt_segments).unwrap();
    std::fs::write(format!("../public/{}_words.vtt", video_id), vtt_words).unwrap();
    std::fs::write(format!("../public/{}_3words.vtt", video_id), vtt_3_words).unwrap();
    std::fs::write(format!("../public/{}_4words.vtt", video_id), vtt_4_words).unwrap();
    std::fs::write(format!("../public/{}_5words.vtt", video_id), vtt_5_words).unwrap();
    std::fs::write(format!("../public/{}_6words.vtt", video_id), vtt_6_words).unwrap();

    Ok(())
}

fn get_video_dimensions(video_path: &str) -> Result<(i32, i32), String> {
    let output = Command::new("ffprobe")
        .args(&[
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "csv=s=x:p=0",
            video_path,
        ])
        .output()
        .map_err(|e| format!("Failed to execute ffprobe: {}", e))?;

    if output.status.success() {
        let output_str = String::from_utf8_lossy(&output.stdout);
        let dimensions: Vec<&str> = output_str.trim().split('x').collect();
        if dimensions.len() == 2 {
            let width = dimensions[0].parse().unwrap_or(0);
            let height = dimensions[1].parse().unwrap_or(0);
            return Ok((width, height));
        }
    }

    Err("Failed to get video dimensions".to_string())
}

#[tauri::command]
async fn trim_video(
    video_id: String,
    timings: Vec<Timing>,
    dimensions: Option<Dimensions>,
) -> Result<String, String> {
    let input = format!("../public/{}.mp4", video_id);
    let output = format!("../public/{}_trimmed.mp4", video_id);

    let mut filters = Vec::new();
    let mut filter_complex = String::new();

    let (video_width, video_height) = get_video_dimensions(&input).unwrap();

    for (i, timing) in timings.iter().enumerate() {
        let mut filter = format!(
            "[0:v]trim=start={}:end={},setpts=PTS-STARTPTS[v{}];[0:a]atrim=start={}:end={},asetpts=PTS-STARTPTS[a{}];",
            timing.start,
            timing.end,
            i,
            timing.start,
            timing.end,
            i
        );

        if let Some(dimensions) = &dimensions {
            let width = (video_width as f32 * dimensions.width / 100.0) as i32;
            let height = (video_height as f32 * dimensions.height / 100.0) as i32;
            let x = (video_width as f32 * dimensions.x / 100.0) as i32;
            let y = (video_height as f32 * dimensions.y / 100.0) as i32;

            filter += &format!(
                "[v{}]crop={}:{}:{}:{},scale=-1:1920,setpts=PTS-STARTPTS[v{}];",
                i, width, height, x, y, i
            );
        }

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
    
    println!("FFmpeg Output: {:?}", &output);

    let output = String::from_utf8_lossy(&output.stdout);

    // extract audio
    let audio_format = "mp3";
    extract_audio(video_id.clone(), audio_format.to_string())
        .await
        .unwrap();

    Ok(output.to_string())
}

#[tauri::command]
async fn check_subtitles(video_id: String) -> Result<bool, String> {
    let path = std::path::Path::new("../public")
        .join(&video_id)
        .with_extension("vtt");

    Ok(path.exists())
}

async fn merge_audio(video_id: &str, audio_format: &str) -> Result<String, String> {
    let video_input = format!("../public/{}_noaudio.mp4", video_id);
    let audio_input = format!("../public/{}_audio_track.{}", video_id, audio_format);
    let output = format!("../public/{}.mp4", video_id);
    let mp3_output = format!("../public/{}_full.mp3", video_id);

    let output = Command::new("ffmpeg")
        .args(&[
            "-y",
            "-i",
            &video_input,
            "-i",
            &audio_input,
            "-c",
            "copy",
            "-map",
            "0:v", // Map video stream from the MP4 file
            "-map",
            "1:a", // Map audio stream from the WebM file
            &output,
        ])
        .output()
        .expect("failed to execute process");

    // Convert audio to mp3 if it's not already in mp3 format
    if audio_format != "mp3" {
        Command::new("ffmpeg")
            .args(&[
                "-y",
                "-i",
                &audio_input,
                "-vn",
                "-ar",
                "44100",
                "-ac",
                "2",
                "-b:a",
                "192k",
                &mp3_output,
            ])
            .output()
            .expect("failed to execute process");

        // Delete the original audio file
        fs::remove_file(&audio_input).expect("failed to remove original audio file");
    }
    fs::remove_file(&video_input).expect("failed to remove original no audio video file");

    let output = String::from_utf8_lossy(&output.stdout);
    Ok(output.to_string())
}

#[tauri::command]
async fn download_youtube_video(url: String) -> Result<String, String> {
    let video_options = VideoOptions {
        quality: VideoQuality::HighestVideo,
        filter: VideoSearchOptions::Video,
        ..Default::default()
    };

    let audio_options = VideoOptions {
        quality: VideoQuality::HighestAudio,
        filter: VideoSearchOptions::Audio,
        ..Default::default()
    };

    let video = Video::new_with_options(url.clone(), video_options).unwrap();
    let video_info = video.get_info().await.unwrap();
    let video_id = video_info.video_details.video_id;
    let video_path = std::path::Path::new("../public")
        .join(format!("{}", &video_id))
        .with_extension("mp4");

    if video_path.exists() {
        return Ok(video_id);
    }

    let audio = Video::new_with_options(url, audio_options).unwrap();

    let audio_extension = audio
        .get_info()
        .await
        .unwrap()
        .formats
        .iter()
        .filter(|f| f.mime_type.mime.to_string().contains("audio"))
        .max_by_key(|f| f.bitrate)
        .map(|f| f.mime_type.container.to_string())
        .unwrap();

    let video_path = std::path::Path::new("../public")
        .join(format!("{}_noaudio", &video_id))
        .with_extension("mp4");

    let audio_path = std::path::Path::new("../public")
        .join(format!("{}_audio_track", &video_id))
        .with_extension(&audio_extension);

    if video_path.exists() {
        return Ok(video_id);
    }

    video.download(video_path).await.unwrap();
    audio.download(audio_path).await.unwrap();

    merge_audio(&video_id, &audio_extension).await.unwrap();

    Ok(video_id)
}

#[tauri::command]
async fn update_vtt(
    video_id: String,
    vtt_content: String,
    sub_type: String,
) -> Result<String, String> {
    let path = match sub_type.as_str() {
        "segments" => std::path::Path::new("../public")
            .join(&video_id)
            .with_extension("vtt"),
        "words" => std::path::Path::new("../public")
            .join(format!("{}_{}", &video_id, sub_type))
            .with_extension("vtt"),
        _ => std::path::Path::new("../public")
            .join(format!("{}_{}", &video_id, sub_type))
            .with_extension("vtt"),
    };

    std::fs::write(path, vtt_content.clone()).unwrap();

    Ok(vtt_content)
}

fn get_vtt_subtitle_path(video_id: &str, sub_type: &str) -> String {
    match sub_type {
        "segments" => format!("../public/{}.vtt", video_id),
        "words" => format!("../public/{}_words.vtt", video_id),
        _ => format!("../public/{}_{}.vtt", video_id, sub_type),
    }
}

fn vtt_line_to_pixel(video_id: &str, path: &str, video_height: i32) -> Result<String, String> {
    let vtt_content =
        std::fs::read_to_string(path).map_err(|e| format!("Error reading file: {}", e))?;
    let mut vtt_lines = vtt_content.lines().peekable();

    let output_path = format!("../public/{}_pixel.vtt", video_id);

    let mut output = String::new();

    // Iterate through the cue lines
    while let Some(line) = vtt_lines.next() {
        if line.contains("-->") && line.contains("line:") {
            let parts: Vec<&str> = line.split("line:").collect();
            let percentage: f32 = parts[1]
                .trim_start()
                .trim_end_matches('%')
                .parse()
                .map_err(|e| format!("Error parsing percentage: {}", e))?;
            let pixels = ((1.0 - percentage / 92.0) * video_height as f32) as i32;
            let new_line = format!("{}line:{}%", parts[0], pixels);
            output.push_str(&new_line);
            output.push('\n');
        } else {
            output.push_str(&line);
            output.push('\n');
        }
    }

    std::fs::write(output_path.clone(), output)
        .map_err(|e| format!("Error writing file: {}", e))?;

    Ok(output_path)
}

fn vtt_to_ass(video_id: &str, sub_type: &str, video_height: i32) -> Result<(), String> {
    let output_path = Path::new("../public/").join(format!("{}.ass", video_id));

    // Try to delete the file if it exists, ignore the error if it does not
    let _ = fs::remove_file(&output_path);

    let path = get_vtt_subtitle_path(&video_id, &sub_type);
    let output_path = vtt_line_to_pixel(&video_id, &path, video_height)?;

    let ass_content = vtt::parse(output_path)
        .map_err(|err| format!("Failed to parse VTT file: {}", err))?
        .to_ass();

    let output_path = Path::new("../public/").join(format!("{}.ass", video_id));

    // Save the initial ass_content
    ass_content
        .to_file(output_path.as_path().to_str().unwrap())
        .map_err(|err| format!("Failed to write ASS file: {}", err))?;

    // Open the saved file
    let file =
        fs::File::open(&output_path).map_err(|err| format!("Failed to open ASS file: {}", err))?;
    let reader = BufReader::new(file);
    let resolution_line_prefix = "PlayResY: ";
    let dialogue_line_prefix = "Dialogue:";
    let mut modified_content = String::new();
    let lines = reader
        .lines()
        .collect::<Result<Vec<_>, io::Error>>()
        .map_err(|err| format!("Failed to read lines: {}", err))?;

    let mut i = 0;
    while i < lines.len() {
        if lines[i].starts_with(dialogue_line_prefix)
            && i + 1 < lines.len()
            && !lines[i + 1].starts_with(dialogue_line_prefix)
            && !lines[i + 1].is_empty()
        {
            // Merge current dialogue line with the next line, appending \N in between
            let merged_line = format!("{}\\N{}", lines[i], lines[i + 1]);
            modified_content.push_str(&merged_line);
            modified_content.push('\n');
            // Skip the next line since it's already appended
            i += 2;
            continue;
        } else if lines[i].starts_with(resolution_line_prefix) {
            // Replace the resolution value with video_height
            let new_line = format!("{}{}", resolution_line_prefix, video_height);
            modified_content.push_str(&new_line);
            modified_content.push('\n');
        } else {
            // Normal line processing
            modified_content.push_str(&lines[i]);
            modified_content.push('\n');
        }
        i += 1;
    }

    // If the resolution line was not found, append it to the end
    if !modified_content.contains(resolution_line_prefix) {
        let new_line = format!("{}{}", resolution_line_prefix, video_height);
        modified_content.push_str(&new_line);
        modified_content.push('\n');
    }

    // Write the modified content back to the file
    fs::write(&output_path, modified_content)
        .map_err(|err| format!("Failed to write modified ASS file: {}", err))?;

    Ok(())
}

#[tauri::command]
async fn clean_files(video_id: &str) -> Result<(), String> {
    // loop through all files in the public folder and delete files with the video_id in the name
    let paths: fs::ReadDir = fs::read_dir("../public").unwrap();
    for path in paths {
        let path = path.unwrap().path();
        if let Some(file_name) = path.file_name() {
            let file_name = file_name.to_str().unwrap();
            if file_name.contains(video_id) {
                fs::remove_file(path).unwrap();
            }
        }
    }

    Ok(())
}

#[tauri::command]
async fn burn_subtitles(
    video_id: String,
    sub_type: String,
    video_height: i32,
) -> Result<String, String> {
    let path = get_vtt_subtitle_path(&video_id, &sub_type);
    if !fs::metadata(&path).is_ok() {
        return Err(format!("Subtitle file does not exist: {:?}", path));
    }

    // convert vtt to ass subtitle
    match vtt_to_ass(&video_id, &sub_type, video_height) {
        Ok(()) => Ok::<String, String>("Subtitle conversion successful".to_string()),
        Err(err) => {
            return Err(err);
        }
    }
    .unwrap();

    let output = format!("../public/{}_burned.mp4", video_id);

    let output = Command::new("ffmpeg")
        .args(&[
            "-y",
            "-i",
            &format!("../public/{}_trimmed.mp4", video_id),
            "-vf",
            &format!("subtitles=../public/{}.ass", video_id),
            &output,
        ])
        .output()
        .expect("failed to execute process");

    println!("{:?}", &output);
    
    let output = String::from_utf8_lossy(&output.stdout);

    Ok(output.to_string())
}

#[tauri::command]
async fn load_vtt(video_id: String, sub_type: String) -> Result<String, String> {
    let path = match sub_type.as_str() {
        "segments" => std::path::Path::new("../public")
            .join(&video_id)
            .with_extension("vtt"),
        "words" => std::path::Path::new("../public")
            .join(format!("{}_{}", &video_id, sub_type))
            .with_extension("vtt"),
        _ => std::path::Path::new("../public")
            .join(format!("{}_{}", &video_id, sub_type))
            .with_extension("vtt"),
    };

    let vtt_content = std::fs::read_to_string(path).unwrap();

    Ok(vtt_content)
}

async fn process_uploaded_file(file_path: &str) -> Result<String, Box<dyn std::error::Error>> {
    let random_id: String = Uuid::new_v4().to_string();

    let path = Path::new(file_path);
    let extension = path.extension().and_then(std::ffi::OsStr::to_str);

    let output: String = format!("../public/{}.mp4", random_id);

    let mp4_filename = match extension {
        Some("mp4") => {
            // copy the file to the public folder with the random id as the filename
            let file_path = Path::new(file_path);
            tokio_fs::copy(file_path, &output).await?;
            output
        },
        Some("webm") | Some("mkv") => {
            // convert the file to mp4 and use the random id as the filename
            let status = Command::new("ffmpeg")
                .args(&["-i", file_path, &output])
                .status()
                .expect("Failed to execute ffmpeg");

            if !status.success() {
                return Err("Failed to convert file".into());
            }
            output
        }
        _ => return Err("Unsupported file format".into()),
    };
    println!("Processed file: {}", mp4_filename);

    let audio_output = format!("../public/{}_full.mp3", random_id);

    let status = Command::new("ffmpeg")
        .args(&["-i", &mp4_filename, "-vn", "-acodec", "libmp3lame", &audio_output])
        .status()
        .expect("Failed to execute ffmpeg");

    if !status.success() {
        return Err("Failed to extract audio".into());
    }

    Ok(random_id)
}

#[tauri::command]
async fn copy_file(filepath: &str) -> Result<String, Option<String>> {
    let id = process_uploaded_file(filepath).await.unwrap();
    Ok(id)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            download_youtube_video,
            trim_video,
            transcribe_audio,
            check_subtitles,
            load_vtt,
            update_vtt,
            burn_subtitles,
            clean_files,
            copy_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
