import { Module } from '@nestjs/common';
import { SampleModule } from './samples/samples.module';
import { GraphModule } from './graphs/graphs.module';
import { ChatModule } from './chat/chat.module';

@Module({
    imports: [
        SampleModule,
        GraphModule,
        ChatModule
    ],
    providers: [],
    controllers: []
})
export class EnterpriseModule {}
