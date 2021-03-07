const config = require("./config")
const mongoose = require('mongoose');
const dbuser = mongoose.model('User', { email: String, passwd: String, status: Boolean, utoken: String, apitoken: String});
mongoose.connect(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});
const rtg = require("random-token-generator");
const nodemailer = require('nodemailer');
const md5 = require("md5");
const sha256 = require("sha256");
const client = require("quick.db")
const ejs = require("ejs")
const express = require("express");
const timeout = require("connect-timeout");
const fs = require("fs");
const path = require("path");
const helmet = require("helmet");
const power = require("./util/cluster.js");
const cmd = require("./util/cmd.js");
const CronJob = require('cron').CronJob;
const { log } = power;


const hget = (headers, obj) => {if(headers[obj]) return headers[obj];return false;}
const get = (req, x) => {if(!req.query[x]) return false;return req.query[x];}
const yandex = nodemailer.createTransport(config.email)

const master = async () => {
  console.log("⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺");
  cmd.info(`Listening on port ${config.port}`, "Master");
  console.log("⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺⸺");
};

const worker = async (app) => {
  // -- Helmet, Cookie Parser And Timeout -- //
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use((req, res, next) => {
    res.setHeader("X-Powered-By", "ApiKit.Net");
    next();
  });
  app.set('view engine', 'ejs');
  app.use("/public",express.static('public'))

  // -- Static Pages And EJS -- //
  app.get("/", (req, res) =>
    res.status(200).json({ status: 200, message: "Website online." })
  );
  app.get("/signin", (req,res) => {res.sendFile(__dirname + "/pages/signin.html")});
app.get("/login", (req,res) => {res.sendFile(__dirname+"/pages/login.html")})
app.get("/password_reset/", (req,res) => {res.sendFile(__dirname+"/pages/resetpassword.html")})
app.get("/password_reset/:token", (req,res) => {
	token = req.params.token
	if(!client.has(token)){return res.send("Your reset token is wrong.")}else{
		res.render("resetpage", {resettoken: token, resetmail: client.get(token)})
	}
})


  // -- Backend -- //
  app.get("/leave", async (req,res) => {res.clearCookie("token");res.redirect("https://apikit.net")});
  app.post("/backsignin", async (req,res) => {
	email = hget(req.headers, "email");
	passwd = hget(req.headers, "passwd");
	if(!email || !passwd) return res.json({error: "Email and password required."})
	if(!/^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/g.test(email)) return res.json({error: "Entered E-Mail is invaild."});
    password = sha256.x2(md5(md5(passwd)))
	if(await dbuser.exists({email: email})) return res.json({error: "User is already exists."})
	rtg.generateKey({
		len:45,
		string: true,
		strong: true,
		retry: true
	}, function(err,key){
		if(err) return res.json({error: "Unexpected error."})
		newuser = new dbuser({email: email, passwd: password, status:false, utoken:key});
		newuser.save()
	    return res.json({status: "OK"})
	});
});

app.post("/backlogin", async (req,res) => {
	email = hget(req.headers, "email");
	passwd = hget(req.headers, "passwd");
	password = sha256.x2(md5(md5(passwd)))
	if(!email || !passwd) return res.json({error: "Email and password required."})
	user = await dbuser.find({email: email})
	if(!user[0]) return res.json({error: "User not exists."})
	if(user[0].passwd !== password) res.json({error: "Wrong password."})
	return res.json({status: 200, utoken: user[0].utoken})
});
app.post("/passresetbackend", async (req,res) => {
	email = hget(req.headers, "email")
	if(!email) return res.json({error: "Email required."})
	sonuc = await dbuser.exists({email: email})
	if(!sonuc) return res.json({error: "User not exists"});
	rtg.generateKey({
		len:45,
		string: true,
		strong: true,
		retry: true
	}, function(err,key){
		if(err) return res.json({error: "Unexpected error."})
		client.set(key, email)
		yandex.sendMail({from: "noreply@apikit.net", to: email, subject:"Password Reset", html: `<h1>Reset your ApiKit.Net password</h1><h3 style="font-weight:normal">URL: <a href="https://apikit.net/password_reset/${key}">https://apikit.net/password_reset/${key}</a></p>`})
	    return res.json({status: "OK"})
	});
})
app.post("/newpassword", async (req,res) => {
	token = hget(req.headers, "token")
	passwd = hget(req.headers, "passwd")
	if(!token || !passwd) return res.json({error: "ticket token and new password required"})
	if(!client.has(token)) return res.json({error: "ticket not in the collection"});
	email = client.get(token)
	password = sha256.x2(md5(md5(passwd)))
	newuser = await dbuser.findOneAndUpdate({email: email}, {$set:{passwd:password}}, {new:true})
	if(password == newuser.passwd){
		client.delete(token)
		return res.json({status: "OK"})
	}else{
		return res.json({error: "Unexpected error."})
	}
})

  // -- Custom Error Handler -- //
  app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({ error: { error: error.status || 500, message: error.message } });
  });

  // -- 404 Error Page -- //
  app.get("*", (req, res) =>
    res.status(404).sendFile(__dirname + "/public/404.html")
  );
  app.listen(config.port);
};

power.load({
  workers: thor.os.cpus().length,
  logToFile: true,
  path: __dirname + "/power.log",
  master,
  worker,
  autoRestart: true,
});

job = new CronJob("0 00 3 * * *", () => {
        fs.unlinkSync("./json.sqlite")
    }, null, true, 'Europe/Istanbul');
job.start();