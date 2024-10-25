import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { GraphModule } from './graphs/graphs.module';

@Module({
    imports: [ChatModule, GraphModule],
    providers: [],
    controllers: []
})
export class EnterpriseModule {}
