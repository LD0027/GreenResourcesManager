/**
 * 生成文案.txt 文件
 * 从 mainSubtitles.tsx 中提取所有 text 并写入到项目根目录的文案.txt
 * 
 * 运行方式：
 *   tsx src/generate-text.ts
 *   或
 *   npm run text:generate
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

// 获取当前文件所在目录（CommonJS 方式）
const currentDir = __dirname;

function generateTextFile() {
	try {
		// 读取 mainSubtitles.tsx 文件
		const mainSubtitlesPath = join(currentDir, 'data/mainSubtitles.tsx');
		const content = readFileSync(mainSubtitlesPath, 'utf-8');
		
		// 使用正则表达式提取所有 text 字段
		// 匹配模式: text: '...' 或 text: "..."
		// 需要处理多行字符串和转义字符
		const texts: string[] = [];
		
		// 匹配 text: '...' 或 text: "..." 的模式
		// 考虑单引号和双引号，以及可能的转义
		const textPattern = /text:\s*(['"])((?:(?:\\.|(?!\1)[^\\])*?))\1/g;
		let match;
		
		while ((match = textPattern.exec(content)) !== null) {
			// match[2] 是文本内容（不包含引号）
			// 处理转义字符
			let text = match[2]
				.replace(/\\n/g, '\n')
				.replace(/\\t/g, '\t')
				.replace(/\\'/g, "'")
				.replace(/\\"/g, '"')
				.replace(/\\\\/g, '\\');
			texts.push(text);
		}
		
		// 格式化文本
		const formattedTexts = texts.map((text, index) => `${index + 1}. ${text}`).join('\n\n');
		
		// 获取项目根目录（从 green-resources-video/src 向上两级）
		const rootDir = resolve(currentDir, '../..');
		const outputPath = join(rootDir, '文案.txt');
		
		// 写入文件
		writeFileSync(outputPath, formattedTexts, 'utf-8');
		console.log(`✅ 文案已成功导出到: ${outputPath}`);
		console.log(`   共提取 ${texts.length} 条文案`);
	} catch (error) {
		console.error('❌ 导出文案时出错:', error);
		process.exit(1);
	}
}

generateTextFile();
