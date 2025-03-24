/**
 *
 * **This module configures a nodemailer transporter for sending emails using Gmail's SMTP server,
 * and exports a function to send an email with a specified subject and body text.**
 *
 * Dependencies:
 * - nodemailer: Used to send emails.
 *
 * @module sendMeEmail
 */

import nodemailer from "nodemailer";

/**
 * The nodemailer transporter configured to use Gmail's SMTP server.
 * Uses port 587 (non-secure; TLS is used via STARTTLS) and requires authentication.
 *
 * @type {nodemailer.Transporter}
 */
export let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: "glider.port.wind.alert@gmail.com",
    pass: "qxhzpfxewjdnqcky",
  },
});

/**
 * Sends an email with the specified subject and text body.
 *
 * @param {string} subject - The subject line of the email.
 * @param {string[]} text - An array of strings that will be joined with newlines to form the email body.
 */
export const sendMeEmail = (subject: string, text: string[]) => {
  // Define the email options.
  const mailOptions = {
    from: '"gpUpdate" <gpupdate@thilenius.com>', // Sender address.
    to: "stephen@thilenius.com", // Recipient address(es).
    subject, // Subject line.
    text: text.join("\n"), // Plain text body.
    // html: '<p>Hello, this is a test email sent from my Node server!</p>' // Optional HTML body.
  };

  // Send the email using the configured transporter.
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.error("Error sending email:", error);
    }
    console.log("Email sent successfully:", info.response);
  });
};
