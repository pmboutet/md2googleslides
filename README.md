# md2googleslides

Convert Markdown or HTML files into Google Slides. Run it locally or inside Docker.

## Features

- Command line tool and embeddable library
- Docker image for reproducible runs
- Example templates and layouts
- HTTP service for automation
- Automatic text resizing to fit placeholders

## Quick start

### With Docker (recommended)

```bash
git clone https://github.com/pmboutet/md2googleslides.git
cd md2googleslides
make docker-build
# convert the example deck
docker run --rm -v $(pwd):/workspace md2googleslides:latest \
  /workspace/examples/example.md --title "Demo"
```

### Local install

```bash
npm install -g md2gslides
md2gslides examples/example.md --title "Demo"
```

## Google configuration

1. Create a project in the [Google Cloud Console](https://console.developers.google.com) and enable the Slides API.
2. Create OAuth 2.0 credentials for a "Web application" and add `http://localhost` to the redirect URIs.
3. Save the JSON file as `~/.md2googleslides/client_id.json` and run the tool once to authorize.

## Examples

The [examples](examples) folder contains a full sample presentation. Generate it with:

```bash
md2gslides examples/example.md --title "Sample Presentation"
```

Example slide syntax:

```markdown
# Title slide

---

## Next slide
Some text with *emphasis* and an image:
![](https://picsum.photos/800/600)
```

### Lists and colors

Bullet lists can start with `-`, `•`, `→` or `★` and numbered lists use the usual `1.` notation. Indent items to create nested lists.

Text color can be set using inline CSS. If the color value isn't a standard CSS color, it is interpreted as a theme color name from your presentation template:

```markdown
<span style="color: ACCENT1">Themed text</span>
```

## Development

Requires Node.js 18+.

```bash
npm install
npm run compile
npm test
```

The `Makefile` provides shortcuts:

```bash
make build
make test
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This project is licensed under the Apache-2.0 License. See [LICENSE](LICENSE) for more information.
