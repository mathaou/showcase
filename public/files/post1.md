<!-- extends layout -->

<!--block content -->

# Adventures in Markdown-To-HTML Conversion
## 19 Dec 2019
### Promises galore!

In creating this portfolio/resume/personal website, I thought it might be nice to have a system where I could just write a series of individual, self-contained posts in markdown format, and then translate that document to [pug](https://pugjs.org/api/getting-started.html)#. It turned out to be a little bit more involved than that, since then generation didn't account for things like links inside of paragraphs or fenced code blocks. There was also plenty of async/await going on behind the scenes in order to make sure that the page didn't render before the conversion took place.

There's also the possibility that I over-thought/ over-engineered the whole thing and made a real SNAFU of a possibly simplistic matter. But at the time, this seemed to be the most elegant way to achieve what I wanted to do.

#### Lets start from the top...

```
    router.get("/", async (req, res, next) => {
        let posts = await generateHTML();

        res.render("index", {
            title,
            now: moment().format("MMMM Do, YYYY"),
            createdPosts: posts.join("")
        });
    });
```

I'm using [express.js](https://expressjs.com/)# for my web server, and signaling it to render my .pug files as HTML. That await right there is the crux of the whole operation. It outputs a list of inline HTML that I then shove into the home page as links to the individualized pages I render from the markdown. 

```
    const generateHTML = () => {
        return new Promise((resolve, reject) => {
            glob(
                path.join(__dirname, "../../public/files/*.md"),
                async (err, files) => {
                    if (err) {
                        reject(err);
                    }

                    const blurb = await readData(files);
                    resolve(blurb);
                }
            );
        });
    };
```

This returns a promise which then searches my /files directory for any .md files and creates the home page link.

```
    const readData = async files => {
        return Promise.all(files.map(file => generateBlurbPromise(file)));
    };
```

This then gets all of the blurbs for all of the .md files into one array.

```
    const generateBlurbPromise = async file => {
        const data = await readFile(file); // this is just a promise that does IO
        return new Promise((resolve, reject) => {
            let headerRegex = /^#{1}\s((?!#).*)$/gim;
            let dateRegex = /^#{2}\s((?!#).*)$/gim;
            let blurbRegex = /^#{3}\s((?!#).*)$/gim;

            let header = (data.match(headerRegex) || []).map(e =>
                e.replace(headerRegex, "$1")
            )[0];
            let date = (data.match(dateRegex) || []).map(e =>
                e.replace(dateRegex, "$1")
            )[0];
            let blurb = (data.match(blurbRegex) || []).map(e =>
                e.replace(blurbRegex, "$1")
            )[0];

            let headerCopy = header.replace(/\s|-|\\|\d/gim, "").toLowerCase();

            createWebPage(data, headerCopy);
            // some stuff that breaks my engine parsing but resolves the blurb back up as inline HTML
        });
    };
```

The actual home page blurb gets resolved up, and the web page gets created in the background. I should probably be using async/await here, too, but I am still a little mistified as to when it's necessary. I kind of just found a configuration that works and hoped it wasn't so superfluous. I kind of cheated by using increasing levels of headers and crazy levels of regular expressions, but it works so 🤷.

```
    # Adventures in Markdown-To-HTML
    ## 19 Dec 2019
    ### Promises galore!
```

I need this structure at the top of every one of my posts, and I need an extra tab in all of my code fences (I tried making it cleaner, but this works every time so far and is much simpler than the positive-lookbehind nonsense that I would have had to do). I also need a delimiter at the end of any links, but other than that I can just type in plaintext and it gets converted to paragraph tags.

```
    const createWebPage = (data, header) => {
        var generated = mdGenerator.render(data);
        var templateString = "extends layout \nblock content \n".length;
        generated = [
            generated.slice(0, templateString),
            "  .row\n    .col-md-8.post-container\n",
            generated.slice(templateString)
            .replace(/\s\s(h\d)/gim, "      $1")
            .replace(/\s\s(p)/gmi, '      $1')
        ].join("");

        generated = generated.replace(/hljs\n(\s*code)/gm, 'hljs\n    $1');

        fs.writeFileSync(`src/views/${header}.pug`, generated);
        router.get(`/${header}`, function(req, res, next) {
            res.render(header, { title });
        });
    };
```

This is the final piece. This creates the webpage and does some regex craziness to fix some of the grey areas that the markdown-to-pug package can't handle very well. I added the functionality with just-about-boilerplate code, but after about a days worth of work I think my whole system is at a point where I'm pretty proud of it. At least proud enough to just use it for a while and not have to poke at the innards.

Source code is on my [github](https://github.com/mathaou/showcase)#!
