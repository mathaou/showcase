// @flow

import express from "express";
import moment from "moment";

import { glob } from "glob";
import path from "path";
import fs from "fs";

const mdGenerator = new (require("markdown-to-pug"))();

var router = express.Router();

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

const readData = async files => {
  return Promise.all(files.map(file => generateBlurbPromise(file)));
};

const readFile = src => {
  return new Promise((resolve, reject) => {
    fs.readFile(src, "utf8", (err, data) => {
      if (err) {
        reject(err);
      }

      resolve(data);
    });
  });
};

const createWebPage = (data, header) => {
  var generated = mdGenerator.render(data);
  var templateString = "extends layout \nblock content \n".length;
  generated = [
    generated.slice(0, templateString),
    "  .row\n    .col-md-8.post-container\n",
    generated.slice(templateString)
      .replace(/\s\s(h\d)/gim, "      $1")
      .replace(/\s\s(p)/gmi, '      $1')
      .replace(/\n\s\s\s\s(a\(href=".*"\)\s.*)\s#/gmi, `#[$1]`)
  ].join("");

  generated = generated.replace(/hljs\n(\s*code)/gm, 'hljs\n    $1');

  fs.writeFileSync(`src/views/${header}.pug`, generated);
  router.get(`/${header}`, function(req, res, next) {
    res.render(header, { title });
  });
};

const generateBlurbPromise = async file => {
  const data = await readFile(file);
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
    let headerHTML = `<h2><a href=\"/${headerCopy}\">${header}</a></h2>`;
    let dateHTML = `<p>${date}</p>`;
    let blurbHTML = `<blockquote>${blurb}</blockquote>`;

    resolve(`<li>${headerHTML}${dateHTML}${blurbHTML}</li>`);
  });
};

let title = "M. Farstad";

/* GET home page. */
router.get("/", async (req, res, next) => {
  let posts = await generateHTML();

  res.render("index", {
    title,
    now: moment().format("MMMM Do, YYYY"),
    createdPosts: posts.join("")
  });
});

router.get("/resume", function(req, res, next) {
  res.render("resume", { title, now: moment().format("MMMM Do, YYYY") });
});

router.get("/resume", function(req, res, next) {
  res.render("resume", { title, now: moment().format("MMMM Do, YYYY") });
});

router.get("/files/resume_cv.pdf", function(req, res, next) {
  res.sendFile("/files/resume_cv.pdf");
});

export default router;
