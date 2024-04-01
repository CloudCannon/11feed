![11feed](https://i.postimg.cc/VNvjtwkN/11feed.png6385)

# 11feed

11feed is an open-source, self-hosted, minimal RSS reader built with the static 
site generator <a href="https://www.11ty.dev/">11ty</a>.

## Core Principles 

* No ads, upsells, or feature bloat
* Encourage the culture of blogging, sharing, and discovery through RSS.
* Generate a purely static site that can be hosted publicly on any web server.
* Keep features, dependencies, and the implementation to the bare essentials.
* Provide a solid base for others to build on and customize for their own needs.
* Emphasis on security.

## Quick Start

1. **Clone the repository**

    ```sh
    git clone https://github.com/cloudcannon/11feed.git
    cd 11feed
    ```

2. **Install dependencies**
    ```sh
    npm install
    ```

3. **Configure your RSS feeds**

    **JSON Configuration**: Place a `.json` file with your feeds in `./src/_feeds/`:

    ```json
    {
      "category": "Web",
      "items": [
        "https://zachleat.com/web/feed/",
        "https://www.smashingmagazine.com/feed/"
      ]
    }
    ```

    **OPML Import**: Put your OPML export in `./src/_feeds/`:

    ```xml
    <?xml version="1.0" encoding="UTF-8"?>
    <opml version="2.0">
      <head>
        <title>Feed List</title>
      </head>
      <body>
        <outline text="Web">
          <outline type="rss" text="Zach Leatherman's Blog" xmlUrl="https://zachleat.com/web/feed/" />
          <outline type="rss" text="Smashing Magazine" xmlUrl="https://www.smashingmagazine.com/feed/" />
        </outline>
      </body>
    </opml>
    ```

4. **Build**

    To build:
    ```sh
    npx @11ty/eleventy
    ```

    To build and serve on `localhost:8080`:
    ```sh
    npx @11ty/eleventy --serve
    ```

5. **Deploy**

    Deploy your site to a static hosting provider. Each platform offers ways to schedule daily builds:

    * [CloudCannon](https://cloudcannon.com/documentation/articles/scheduling-your-builds-manually/)
    * [Netlify](https://docs.netlify.com/functions/scheduled-functions/)
    * [Vercel](https://vercel.com/guides/how-to-setup-cron-jobs-on-vercel)
    * [Cloudflare pages](https://developers.cloudflare.com/pages/configuration/deploy-hooks/)
    * [GitHub Pages](https://danielsaidi.com/blog/2022/05/11/schedule-github-pages-rebuild-with-github-actions)

## Useful Resources

* [11ty Documentation](https://www.11ty.dev/docs/) - Learn more about how to use 11ty.
* [Explore RSS feeds in your neighbourhood](https://rss-is-dead.lol/) - Finds RSS feeds from people you follow on the Fediverse.
* [List of frontend feeds](https://github.com/impressivewebs/frontend-feeds) - Another way to discover new people to follow.

## Contributing

We welcome contributions! Whether it's feature suggestions, bug reports, or pull requests, all contributions are appreciated. Please submit an issue or pull request if you'd like to improve 11feed.

## License

11feed is open source and available under the [MIT License](/LICENSE).