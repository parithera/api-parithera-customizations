import { forwardRef, Module } from '@nestjs/common';
import { BaseToolService } from './base.service';
import { RAGToolService } from './rag.service';
import { ScanpyToolService } from './scanpy.service';
import { SampleModule } from 'src/enterprise_modules/samples/samples.module';
import { ResultsModule } from 'src/codeclarity_modules/results/results.module';
import { ProjectsModule } from 'src/base_modules/projects/projects.module';
import { AnalyzersModule } from 'src/base_modules/analyzers/analyzers.module';
import { AnalysesModule } from 'src/base_modules/analyses/analyses.module';

@Module({
	imports: [
		AnalysesModule,
		AnalyzersModule,
		forwardRef(() => SampleModule),
		ProjectsModule,
		ResultsModule
	],
	providers: [BaseToolService, RAGToolService, ScanpyToolService],
	exports: [BaseToolService, RAGToolService, ScanpyToolService],
	controllers: []
})
export class ToolsModule { }
