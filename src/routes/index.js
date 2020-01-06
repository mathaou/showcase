// @flow

import express from "express";
import moment from "moment";

import { glob } from "glob";
import path from "path";
import fs from "fs";

const chunkSize = 5;
const mdGenerator = new (require("markdown-to-pug"))();
const title = "M. Farstad";
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
      .replace(/\s\s\s\s(em.*\n)/gmi, `      $1`)
      .replace(/\s\s\s\s(img\(src=".*\))/gmi, `      $1.generated`)
      .replace(/\n\s*h3.*\n/gm, '\n')
  ].join("");

  generated = generated.replace(/hljs\n(\s*code)/gm, 'hljs\n    $1');

  fs.writeFileSync(`src/views/${header}.pug`, generated);
  router.get(`/${header}`, (req, res, next) => {
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

const chunkArrayInGroups = (arr, size) => {
  var myArray = [];
  for(var i = 0; i < arr.length; i += size) {
    myArray.push(arr.slice(i, i+size));
  }
  return myArray;
};

const generatePagination = (length, index) => {
  var previous = (index == 2) ? '/' : `/page${index-1}/`;
  var next = `/page${index+1}/`;
  
  var leftArrow = (index == 1) ? `<span class =\"page-item\"><<</span>` : `<a href=\"${previous}\" class =\"page-item\"><<</a>`;
  var rightArrow = (index == length) ? `<span class =\"page-item\">>></span>` : `<a href=\"${next}\" class =\"page-item\">>></a>`;

  var current = `<span class=\"page-item\">${index}</span>`;

  var pagination = leftArrow;

  for(var i = 1; i < length + 1; i++) {
    var toAdd = (i == 1) ? '/' : `/page${i}/`;
    if(i != index) {
      pagination = pagination.concat(`<a href=\"${toAdd}\" class =\"page-item\">${i}</a>`)
    } else {
      pagination = pagination.concat(current);
    }
  };

  return pagination.concat(rightArrow);
};

const createMultiplePages = async () => {
  var posts = await generateHTML();

  const postChunks = chunkArrayInGroups(posts, chunkSize) || [''];

  for(let i = 0; i < postChunks.length; i++) {
    const chunkStore = postChunks[i];
    if(i === 0) {
      router.get("/personal", (req, res, next) => {
        res.render("index", {
          title,
          now: moment().format("MMMM Do, YYYY"),
          createdPosts: chunkStore.join(""),
          pages: generatePagination(postChunks.length, i + 1)
        });
      });
    } else {
      const fileName = `page${i+1}`;
      fs.copyFileSync('src/views/index.pug', `src/views/${fileName}.pug`);
      router.get(`/${fileName}`, (req, res, next) => {
        res.render(fileName, {
          title,
          now: moment().format("MMMM Do, YYYY"),
          createdPosts: chunkStore.join(""),
          pages: generatePagination(postChunks.length, i + 1)
        });
      });
    }
  }
};

createMultiplePages();

router.get("/", (req, res, next) => {
  res.render("resume", { title, now: moment().format("MMMM Do, YYYY") });
});

router.get("/resume", (req, res, next) => {
  res.render("resume", { title, now: moment().format("MMMM Do, YYYY") });
});

router.get("/music", (req, res, next) => {
  res.render("music", { title, now: moment().format("MMMM Do, YYYY") });
});

router.get("/projects", (req, res, next) => {
  res.render("projects", { title, now: moment().format("MMMM Do, YYYY") });
});

router.get("/files/resume_cv.pdf", (req, res, next) => {
  res.sendFile("/files/resume_cv.pdf");
});

export default router;
