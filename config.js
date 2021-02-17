module.exports = {
    mongodb: "", // mongodb connection url
    email: {
        host: "smtp.yandex.com.tr",
        direct: true,
        port: 465,
        secure: true,
        auth: {
            user: 'noreply@apikit.net',
            pass: "" // email password
        } 
    }
}