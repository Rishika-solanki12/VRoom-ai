from services.image_service import generate_image


prompt = """
Cute cinematic 3D cartoon lion walking through a lush colorful jungle,
golden-orange fur, fluffy brown mane, big friendly expressive eyes,
morning sunlight filtering through trees, children's animated movie style,
high quality cartoon frame, wide cinematic shot.
"""

print("Generating test image...")

image_path = generate_image(
    prompt=prompt,
    filename="cloudflare_test.png"
)

print("SUCCESS!")
print("Image saved at:", image_path)