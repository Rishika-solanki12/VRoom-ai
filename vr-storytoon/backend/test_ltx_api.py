from gradio_client import Client

print("Connecting to LTX...")

client = Client("Upsampler/ltx-video")

print("\n========== LTX API ==========\n")

client.view_api()