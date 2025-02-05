import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { GraphModule } from './graphs/graphs.module';
import { SampleModule } from './samples/samples.module';

@Module({
    imports: [ChatModule, GraphModule, SampleModule],
    providers: [],
    controllers: []
})
export class EnterpriseModule {}
