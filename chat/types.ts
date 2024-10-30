import { ApiProperty } from '@nestjs/swagger';

export class AskGPT {
    @ApiProperty()
    request: string;

    @ApiProperty()
    userId: string;

    @ApiProperty()
    projectId: string;

    @ApiProperty()
    organizationId: string;
}
