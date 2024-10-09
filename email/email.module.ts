import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

@Module({
    imports: [
        MailerModule.forRootAsync({
            useFactory: (config: ConfigService) => ({
                transport: {
                    host: config.getOrThrow<string>('MAIL_HOST'),
                    port: config.getOrThrow<number>('MAIL_PORT'),
                    secure: true,
                    auth: {
                        user: config.getOrThrow<string>('MAIL_AUTH_USER'),
                        pass: process.env.MAIL_AUTH_PASSWORD
                    }
                },
                preview: false,
                defaults: {
                    from: config.getOrThrow<string>('MAIL_DEFAULT_FROM')
                },
                template: {
                    dir: join(__dirname, 'templates'),
                    adapter: new HandlebarsAdapter(),
                    options: {
                        strict: true
                    }
                },
                options: {
                    partials: {
                        dir: join(__dirname, 'templates', 'partials'),
                        options: {
                            strict: true
                        }
                    }
                }
            }),
            inject: [ConfigService]
        })
    ],
    providers: [EmailService],
    exports: [EmailService]
})
export class EmailModule {}
