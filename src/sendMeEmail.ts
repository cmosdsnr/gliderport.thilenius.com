/**
 * @packageDocumentation
 *
 * **This module configures a nodemailer transporter for sending emails using Gmail's SMTP server,
 * and exports a function to send an email with a specified subject and body text.**
 *
 * ## Dependencies
 * - `nodemailer`: Used to send emails via SMTP.
 *
 * @module sendMeEmail
 */

import nodemailer from "nodemailer";

/**
 * Nodemailer transporter configured to use Gmail's SMTP server.
 *
 * - **Host:** smtp.gmail.com
 * - **Port:** 587 (STARTTLS)
 * - **Secure:** `false` (uses STARTTLS instead of SSL/TLS)
 * - **Auth:** Gmail account credentials
 *
 * @type {nodemailer.Transporter}
 */
export const transporter: nodemailer.Transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "glider.port.wind.alert@gmail.com",
    pass: "qxhzpfxewjdnqcky",
  },
});

/**
 * Sends an email with the specified subject and body text.
 *
 * @param subject - The subject line of the email.
 * @param text    - An array of strings that will be joined with newline characters to form the email body.
 *
 * @example
 * ```ts
 * sendMeEmail(
 *   "Monthly archive job completed",
 *   [
 *     "2025-06-02 00:00:00 archiveLastMonth: Archived 123 records to 2025-05.bin",
 *     "2025-06-02 00:00:10 archive cron: Monthly archive job completed."
 *   ]
 * );
 * ```
 */
export const sendMeEmail = (subject: string, text: string[]): void => {
  const mailOptions: nodemailer.SendMailOptions = {
    from: '"gpUpdate" <gpupdate@thilenius.com>', // Sender address
    to: "stephen@thilenius.com", // Recipient address
    subject, // Subject line
    text: text.join("\n"), // Plain-text body
    // html: '<p>Optional HTML body</p>'           // Uncomment to send HTML content
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      return;
    }
    console.log("Email sent successfully:", info.response);
  });
};
