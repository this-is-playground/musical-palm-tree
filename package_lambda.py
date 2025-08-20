#!/usr/bin/env python3
"""
Script to create a proper Lambda deployment package with dependencies.
"""
import os
import shutil
import subprocess
import tempfile
import zipfile

def create_lambda_package():
    """Create a Lambda deployment package with all dependencies."""
    print("Creating Lambda deployment package...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        package_dir = os.path.join(temp_dir, 'package')
        os.makedirs(package_dir)
        
        print("Installing dependencies...")
        subprocess.run([
            'pip3', 'install', 
            '-r', 'lambda_requirements.txt',
            '-t', package_dir
        ], check=True)
        
        print("Copying application files...")
        shutil.copy('lambda_adapter.py', package_dir)
        shutil.copytree('service', os.path.join(package_dir, 'service'))
        
        zip_path = 'lambda_package.zip'
        print(f"Creating zip file: {zip_path}")
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(package_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arc_path = os.path.relpath(file_path, package_dir)
                    zipf.write(file_path, arc_path)
        
        print(f"Lambda package created: {zip_path}")
        print(f"Package size: {os.path.getsize(zip_path) / 1024 / 1024:.2f} MB")
        
        print("\nPackage contents:")
        with zipfile.ZipFile(zip_path, 'r') as zipf:
            for name in sorted(zipf.namelist())[:20]:  # Show first 20 files
                print(f"  {name}")
            if len(zipf.namelist()) > 20:
                print(f"  ... and {len(zipf.namelist()) - 20} more files")

if __name__ == "__main__":
    create_lambda_package()
