# Upload DANI Logo to Storage

To complete the watermark setup, you need to upload the DANI logo to Supabase Storage:

## Steps:

1. **Go to Cloud Dashboard** (right panel → Cloud mode)
2. **Navigate to Storage tab**
3. **Select the "branding" bucket**
4. **Upload the file**: `public/dani-watermark-logo.png`
5. **Name it exactly**: `dani-logo.png`

Once uploaded, all generated images will automatically have the DANI logo watermark in the bottom-right corner! ✨

The logo will be:
- Automatically sized (8% of image width, max 150px)
- Positioned in bottom-right corner with padding
- On a semi-transparent white background for visibility
- Falls back to text "DANI" if logo fails to load

---

**Note**: The file `public/dani-watermark-logo.png` has been generated and is ready to upload!