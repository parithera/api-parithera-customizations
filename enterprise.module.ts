import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { SampleModule } from './samples/samples.module';
import { GraphModule } from './graphs/graphs.module';

@Module({
    imports: [ChatModule, SampleModule, GraphModule],
    providers: [],
    controllers: []
})
export class EnterpriseModule {}
