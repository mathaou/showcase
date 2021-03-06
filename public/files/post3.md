<!-- extends layout -->

<!--block content -->

# Routing HTTP Traffic to HTTPS
## 10 Jan 2020
### Filtering for correct DNS entry, too!

This post is going to be short - It's mostly for my own/ future use (provided my setup is the same), but I suppose the principal of the lesson I learned is applicable elsewhere, too.

I wanted incoming traffic to be HTTPS because I spent a while learning how to create SSL certs for the website. But the domain is only valid if it uses a specific URL, so here's what I came up with. 

Routing all non www. traffic:
```
    const app = express();
    app.enable('trust proxy');

    app.use((req, res, next) => {
        if (req.headers.host.slice(0, 4) !== 'www.') {
            var newHost = 'www.' + req.headers.host;
            return res.redirect(301, req.protocol + '://' + newHost + req.originalUrl);
        }
        next();
    }); 
```
Be careful with reading from '/' with fs, you will likely need to mess with file permissions.
```
    const generateHTTPSData = () => {
        return {
            key: fs.readFileSync('/etc/letsencrypt/live/www.mfarstad.com/privkey.pem'),
            cert: fs.readFileSync('/etc/letsencrypt/live/www.mfarstad.com/cert.pem'),
            ca: fs.readFileSync('/etc/letsencrypt/live/www.mfarstad.com/chain.pem')
        }
    }
```
This is the annoying part. I tried various other solutions that claimed to be http-https routing packages, but I either couldn't get them to work or they were for websites less complicated than mine. So you have to create a TLS router on {desiredPort} that pipes the connection to the appropriate port (http: {desiredPort + 1}, https: {desiredPort + 2}}).
```

    net.createServer((conn) => {
        conn.once('data', (buf) => {
            // A TLS handshake record starts with byte 22.
            var address = (buf[0] === 22) ? port + 2 : port + 1;
            var proxy = net.createConnection(address, () => {
                proxy.write(buf);
                conn.pipe(proxy).pipe(conn);
            });
        })
    }).listen(port);
```
I don't like this solution because there are 3 servers running concurrently (ewww.....) but trust me, I tried finding some other way. I'll likely just default to some AWS default thing that handles all of this automatically. But I don't know, I feel like having this level of control is a good thing... Having a VM in cloud suited my needs, and I can use it to host whatever I need, even if it's not a website. And I've learned a lot doing it! So that's always a good thing.

Anyway, http server just routes to https. Took a while to figure out how to get express to play nice with user defined ports, since http and https are 80 and 443 by default, respectively.
```
    http.createServer((req, res) => {
        var host = req.headers['host'];
        res.writeHead(301, { "Location": "https://" + host + req.url });
        res.end();
    }).listen(port + 1);

    var secureServer = https.createServer(generateHTTPSData(), app);
```
That's all, folks!