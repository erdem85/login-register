module.exports = {
    port: 3000,
    mongodb: "", // mongodb connection url
    email: {
        host: "smtp.yandex.com.tr", // default yandex.mail
        direct: true,
        port: 465,
        secure: true,
        auth: {
            user: 'noreply@apikit.net',
            pass: "" // email password
        } 
    }
}