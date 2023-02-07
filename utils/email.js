const nodemailer = require('nodemailer');
const fs = require('fs/promises');
const htmlToText = require('html-to-text');

module.exports = class Email {
    constructor(user, url) {
        this.to = user.email;
        this.firstName =
            user.name.split(' ')[0] + ' ' + user.name.split(' ')[1];
        this.url = url;
        this.from = process.env.EMAIL_USERNAME;
    }
    newTransport() {
        if (process.env.NODE_ENV === 'production') {
            //sendgrid
        }
        return nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE,
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: true,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            },
            //activate in gmail "less secure app" option
        });
    }
    async send(html, subject) {
        const mailOptions = {
            from: this.from,
            to: this.to,
            subject: subject,
            html,
            text: htmlToText.fromString(html),
        };
        await this.newTransport().sendMail(mailOptions);
    }

    async sendWelcome() {
        let html = await fs.readFile(
            `${__dirname}/.././emails/welcomeEmail.html`,
            'utf-8'
        );
        html = html.replace('#NAME#', this.firstName);
        await this.send(html, 'Welcome to Garden Notes');
    }
    async sendNameChanged() {
        let html = await fs.readFile(
            `${__dirname}/.././emails/nameChanged.html`,
            'utf-8'
        );
        html = html.replace('#NAME#', this.firstName);
        await this.send(html, 'Your Name Changed');
    }
    async sendResetPassword() {
        let html = await fs.readFile(
            `${__dirname}/.././emails/resetPassword.html`,
            'utf-8'
        );

        html = html.replace('#NAME#', this.firstName);
        html = html.replace('#URL#', this.url);
        await this.send(html, 'Reset Your Password');
    }
    async verifyEmail() {
        let html = await fs.readFile(
            `${__dirname}/.././emails/verifyEmail.html`,
            'utf-8'
        );

        html = html.replace('#NAME#', this.firstName);
        html = html.replace('#URL#', this.url);
        await this.send(html, 'Verify Your Email');
    }
};

/*
const sendEmail = async options => {
    //1 create a transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        host:process.env.EMAIL_HOST,
        port:process.env.EMAIL_PORT,
        secure:true,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
        //activate in gmail "less secure app" option
    });
    //2 define the email options
    const mailOptions = {
        from: process.env.EMAIL_USERNAME,
        to: options.email,
        subject: options.subject,
        text: options.message
        //html:
    };
    //3 actually send the email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
*/
