import * as fs from 'fs'

import * as ipfs from "ipfs"
import express from "express"
import pug from "pug"
import bodyParser from "body-parser"

import MarkdownIt from 'markdown-it'
var md = new MarkdownIt()

import hljs from "highlight.js"

import path from "path"
import {fileURLToPath} from "url"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

var app = express()
app.use(express.static('res'))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json())

let node

ipfs.create({"repo": __dirname + "Cache"})
.then(n => {
	node = n
})

class documents{
	constructor(){
		this.filePath = __dirname + "Cache/saved.json"
		this.files = []
		
		if (fs.existsSync(this.filePath)){
			this.__load()
		}else {
			this.__dump()
		}
	}
	async __get(cid){
		var text = ""

		for await (const chunk of node.cat(cid)){
			text += chunk
		}
		return text.toString()
	}
	__load(){
		this.files = fs.readFileSync(this.filePath)
	}
	__dump(){
		fs.writeFileSync(this.filePath, JSON.stringify(this.files))
	}
	id_gen(){
		chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

		string = ""

		while (string.length < 20){
			string += chars[parseInt(Math.random() * 36) + 1]
		}

		return string
	}
	namer(text){
		return /# (.+)/.exec(text)[1]
	}
	async save(cid){
		if (did){
			for (var index in this.files){
				if (this.files[index].did == did){
					this.files.splice(index, 1)
				}
			}
		} else{
			var did = this.id_gen()
		}
		var text = await this.__get(cid)

		this.files.unshift({did: did, cid: cid, title: this.namer(text)})
		this.__dump()
	}
}

var docs = new documents()

app.get("/", (req, res) => {
	res.send(pug.renderFile("pages/home.pug", {title: "Document Search"}))
})

app.get("/docs", (req, res) => {
	res.send(pug.renderFile("pages/docs.pug", {title: "Your Documents", files: docs.files}))
})


app.route("/write")
	.get((req, res) => {
		res.send(pug.renderFile("pages/write.pug", {title: "New Document"}))
	})
	.post((req, res) => {
		node.add(req.body.article)
			.then(cid => {
				res.redirect("/read?article=" + cid.path)
			})
	})

app.get("/read", async (req, res) => {
	var text = await docs.__get(req.query.article)
	var title = docs.namer(text)
	res.send(pug.renderFile("pages/read.pug", {article: md.render(text), title: title}))
})

app.post("/save", async (req, res) => {
	console.log(req.body)
	//docs.save(req.query.cid, did = req.query.did)
})

app.listen(4675, () => {
	console.log("Listening on port: 4675")
})