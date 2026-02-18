#!/usr/bin/env python3
"""
Model Preloader - Warm up AI detection models at server startup
This eliminates cold-start penalty on first analysis request
"""

import sys
import os

# Set HuggingFace cache directory
if os.path.exists('/var/app/current'):
    cache_dir = '/var/app/current/.cache/huggingface'
else:
    cache_dir = os.path.expanduser('~/.cache/huggingface')

try:
    os.makedirs(cache_dir, exist_ok=True)
    os.environ['HF_HOME'] = cache_dir
    os.environ['TRANSFORMERS_CACHE'] = cache_dir
except Exception as e:
    print(f"Warning: Could not create cache dir: {e}", file=sys.stderr)

# Import and run preloader
try:
    from ai_detector import preload_models
    
    print("Starting model preload...", file=sys.stderr)
    success = preload_models()
    
    if success:
        print("✓ Model preload completed successfully", file=sys.stderr)
        sys.exit(0)
    else:
        print("⚠ Model preload failed", file=sys.stderr)
        sys.exit(1)
        
except Exception as e:
    print(f"✗ Model preload error: {e}", file=sys.stderr)
    sys.exit(1)
