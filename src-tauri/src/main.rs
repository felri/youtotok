// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use rusty_ytdl::{Video, VideoOptions, VideoQuality, VideoSearchOptions};

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

    let path = std::path::Path::new("../public").join(&video_id).with_extension("mp4");

    video.download(path).await.unwrap();

    Ok(video_id)
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    println!("Hello, {}!", name);
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet, download_youtube_video])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
