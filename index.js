const config = require("./config")
const express = require("express");
const web = express();
const mongoose = require('mongoose');
const dbuser = mongoose.model('User', { email: String, passwd: String, status: Boolean, utoken: String, apitoken: String});
mongoose.connect(config.mongodb, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});
const cookieParser = require("cookie-parser");
const rtg = require("random-token-generator");
const nodemailer = require('nodemailer');
const md5 = require("md5");
const sha256 = require("sha256");
const Collection = require("@discordjs/collection")
const passwords = new Collection();
const ejs = require("ejs")

const get = (req, x) => {
	if(!req.query[x]) return false;
	return req.query[x];
}

const yandex = nodemailer.createTransport(config.email)
web.use(cookieParser());
web.set('view engine', 'ejs');
web.use("/public",express.static('public'))
web.get("/backsignin", async (req,res) => {
	email = get(req, "email");
	passwd = get(req, "passwd");
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
		console.log("successful signin")
		newuser = new dbuser({email: email, passwd: password, status:false, utoken:key});
		newuser.save()
	    return res.json({status: "OK"})
	});
});
web.get("/", (req,res) => res.send("Hello World"))
web.get("/backlogin", async (req,res) => {
	email = get(req, "email");
	passwd = get(req, "passwd");
	password = sha256.x2(md5(md5(passwd)))
	if(!email || !passwd) return res.json({error: "Email and password required."})
	user = await dbuser.find({email: email})
	if(!user[0]) return res.json({error: "User not exists."})
	if(user[0].passwd !== password) res.json({error: "Wrong password."})
	return res.json({status: 200, utoken: user[0].utoken})
});

web.get("/leave", async (req,res) => {res.clearCookie("token");res.redirect("http://localhost:3000")});
web.get("/signin", (req,res) => {res.sendFile(__dirname + "/pages/signin.html")});
web.get("/login", (req,res) => {res.sendFile(__dirname+"/pages/login.html")})
web.get("/password_reset/", (req,res) => {res.sendFile(__dirname+"/pages/resetpassword.html")})
web.get("/password_reset/:token", (req,res) => {
	token = req.params.token
	if(!passwords.has(token)){return res.send("Your reset token is wrong.")}else{
		res.render("resetpage", {resettoken: token, resetmail: passwords.get(token)})
	}
})

web.get("/passresetbackend", async (req,res) => {
	email = get(req, "email")
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
		passwords.set(key, email);
		yandex.sendMail({from: "noreply@apikit.net", to: email, subject:"Password Reset", html: `<h1>Reset your ApiKit.Net password</h1><h3 style="font-weight:normal">URL: <a href="https://localhost:3000/password_reset/${key}">http://localhost:3000/password_reset/${key}</a></p>`})
	    return res.json({status: "OK"})
	});
})
web.get("/newpassword", async (req,res) => {
	token = get(req, "token")
	passwd = get(req, "passwd")
	if(!token || !passwd) return res.json({error: "ticket token and new password required"})
	if(!passwords.has(token)) return res.json({error: "ticket not in the collection"});
	email = passwords.get(token)
	password = sha256.x2(md5(md5(passwd)))
	newuser = await dbuser.findOneAndUpdate({email: email}, {$set:{passwd:password}}, {new:true})
	if(password == newuser.passwd){
		passwords.delete(token)
		return res.json({status: "OK"})
	}else{
		return res.json({error: "Unexpected error."})
	}
})

web.listen(3000, () => {console.log("Web server listening at 3000 port.")});