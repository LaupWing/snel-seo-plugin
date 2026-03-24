# Snel SEO — Deployment & Releases

## How updates work

The plugin uses `plugin-update-checker` with GitHub release assets. When you publish a release on GitHub, a workflow builds a zip and attaches it. WordPress detects the new version and shows "Update available".

## Setup on a new site

Add this to `wp-config.php`:

```php
define( 'SNEL_SEO_GITHUB_TOKEN', 'github_pat_xxxxx' );
```

Generate the token at: **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**
- Repository access: Only `snel-seo-plugin`
- Permissions: Contents → Read-only

## Pushing an update

1. Bump the version in `snel-seo.php` (both the header and `SNEL_SEO_VERSION` constant)
2. Push to main
3. Go to the repo → **Releases → Create a new release**
4. Tag: `v1.0.1` (matching the version)
5. Click **Publish release**
6. The workflow builds the zip automatically — WordPress will show the update
