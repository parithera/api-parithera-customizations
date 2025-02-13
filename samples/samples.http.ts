import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class SamplesImportBody {
    @ApiProperty()
    @IsOptional()
    name: string;

    @ApiProperty()
    @IsOptional()
    description: string;

    @ApiProperty()
    @IsOptional()
    tags: string[];
}

export class AssociateProjectToSamplesPatchBody {
    @ApiProperty()
    @IsOptional()
    samples: Array<string>;

    @ApiProperty()
    @IsOptional()
    projectId: string;
}