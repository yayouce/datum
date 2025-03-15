// import * as nodemailer from 'nodemailer';
// import { Injectable } from '@nestjs/common';

// @Injectable()
// export class MailService {
//   private transporter;

//   constructor() {
//     this.transporter = nodemailer.createTransport({
//       service: 'gmail', 
//       auth: {
//         user: 'datumnabladp@gmail.com',
//         pass: 'N@blaDp_',
//       },
//     });
//   }

//   async sendMail(to: string, subject: string, text: string) {
//     try {
//       const info = await this.transporter.sendMail({
//         from: '"Support" datumnabladp@gmail.com',
//         to,
//         subject,
//         text,
//       });
//       console.log('E-mail envoyé : %s', info.messageId);
//     } catch (err) {
//       console.error('Erreur lors de l\'envoi du mail:', err);
//       throw new Error('Impossible d\'envoyer l\'email.');
//     }
//   }
// }
