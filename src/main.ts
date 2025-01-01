import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerDocumentOptions, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService)
  //app.useGlobalFilters(new AllExceptionsFilter());
  

  // CORS : j'accepte toutes les origines
  app.enableCors({
    // true for all origins
    origin: '*',
  });
  


  app.useGlobalPipes(new ValidationPipe(
    {
      transform : true,
      whitelist:true,  //je ne prends que mes données attendu
      forbidNonWhitelisted:true  // j'envoie une erreur
    }
  ));
  
  
//documentation

// const options: SwaggerDocumentOptions=  {
//   operationIdFactory: (
//     controllerKey: string,
//     methodKey: string
//   ) => methodKey
// };// pour eviter de mettre dans la documention UserController_createUser ou autre je préfère simplement createUser
// const config = new DocumentBuilder()  // DocumentBuilder() pour creer un doc conformement aux spécifications de OPENAPI
//                   .addBearerAuth() //pour spécifier l'utilisation de l'authentification dans le swagger
//                   .addBasicAuth()
//                   .setTitle('my cv swagger')
//                   .setDescription('ceci est l\'Api mis en place par monsieur diarra')
//                   .setVersion('1.0')
//                   .build()
                  
//                   ;

// const document = SwaggerModule.createDocument(app, config,options);//  http://localhost:3005/swagger/api
// //createDocument pour creer un document complet de toutes les routes api
// SwaggerModule.setup('swager/api', app, document,{
//   jsonDocumentUrl:'swager/json'  //c disponible ici
//   });  //ajouter une option pour pouvoir avoir le swager en format json

  await app.listen(configService.get('HTTP_PORT') ||3000);


  
  
}










bootstrap();
