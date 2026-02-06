import os
import hashlib

def calculate_sha256(filepath):
    """Calculates the SHA256 checksum of a file."""
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        # Read and update hash string in chunks
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def verify_component_checksums(base_dir):
    """
    Verifies checksums of components in the src/components directory.
    Prints the SHA256 hash for each file.
    """
    components_dir = os.path.join(base_dir, 'src', 'components')
    print(f"Verifying checksums in: {components_dir}")

    if not os.path.isdir(components_dir):
        print(f"Error: Directory not found at {components_dir}")
        return

    for root, _, files in os.walk(components_dir):
        for filename in files:
            filepath = os.path.join(root, filename)
            try:
                checksum = calculate_sha256(filepath)
                print(f"{filepath}: {checksum}")
            except Exception as e:
                print(f"Error processing {filepath}: {e}")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    verify_component_checksums(current_dir)
