import { Module } from '@nestjs/common';
import { BaseToolService } from './base.service';
import { RAGToolService } from './rag.service';
import { ScanpyToolService } from './scanpy.service';
import { AnalysesModule } from 'src/codeclarity_modules/analyses/analyses.module';
import { AnalyzersModule } from 'src/codeclarity_modules/analyzers/analyzers.module';
import { SampleModule } from 'src/enterprise_modules/samples/samples.module';
import { ProjectsModule } from 'src/codeclarity_modules/projects/projects.module';

@Module({
	imports: [
		AnalysesModule,
		AnalyzersModule,
		SampleModule,
		ProjectsModule,
	],
	providers: [BaseToolService, RAGToolService, ScanpyToolService],
	exports: [BaseToolService, RAGToolService, ScanpyToolService],
	controllers: []
})
export class ToolsModule { }
