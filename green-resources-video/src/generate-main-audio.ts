import { AudioMaker } from './audio-maker';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync, unlinkSync, rmdirSync } from 'fs';
import { join } from 'path';

async function main() {
  // ========== 配置：修改这里的路径 ==========
  const MAIN_SUBTITLES_FILE = join(__dirname, 'data/mainSubtitles.tsx');
  const OUTPUT_DIR = join(__dirname, 'output/main-audio'); // 输出目录
  
  // ⚠️ 重要提示：
  // 启动 API 时必须指定模型路径（-g 和 -s 参数），否则会报 KeyError: 'default' 错误
  // 完整启动命令示例：
  //   python api.py -a 127.0.0.1 -p 9880 -g "GPT_weights_v2/me-e15.ckpt" -s "SoVITS_weights_v2/me_e8_s136.pth" -dr "test.wav" -dt "参考文本" -dl "zh"
  // 注意：参考音频已在启动 API 时通过 -dr, -dt, -dl 参数指定，此处无需再传
  
  // ========== 文本配置 ==========
  const TEXT_LANG = 'zh'; // 需要合成的语种：'zh'（中文）、'zh_mix_en'（中英混合）、'en'（英文）等
  
  // 文本切分符号 (v1 API 使用 cut_punc，如 "，。？！" 等标点符号)
  const CUT_PUNC = '，。？！、；：'; // 用于切分文本的标点符号
  
  // 语速
  const SPEED = 1.0; // 语速（默认: 1.0，高为更快）
  
  // 采样参数（v1 API 默认值：top_k=15, top_p=1.0, temperature=1.0）
  const TOP_K = 20;      // top k sampling (默认: 15)
  const TOP_P = 0.95;    // top p sampling (默认: 1.0)
  const TEMPERATURE = 1.0; // temperature (默认: 1.0)
  // ==========================================

  // 读取文件并提取所有 text 字段
  console.log('正在读取 mainSubtitles.tsx 文件...');
  const fileContent = readFileSync(MAIN_SUBTITLES_FILE, 'utf-8');
  
  // 简单粗暴：用正则表达式提取所有 text: '...' 或 text: "..."
  const textPattern = /text:\s*['"]([^'"]+)['"]/g;
  const texts: string[] = [];
  let match;
  
  while ((match = textPattern.exec(fileContent)) !== null) {
    const text = match[1];
    if (text.trim().length > 0) {
      texts.push(text);
    }
  }
  
  console.log(`找到 ${texts.length} 个文本片段\n`);

  // 清理输出目录中的旧文件
  if (existsSync(OUTPUT_DIR)) {
    console.log('正在清理输出目录中的旧文件...');
    const files = readdirSync(OUTPUT_DIR);
    let deletedCount = 0;
    for (const file of files) {
      const filePath = join(OUTPUT_DIR, file);
      try {
        unlinkSync(filePath);
        deletedCount++;
      } catch (error) {
        console.warn(`警告: 无法删除文件 ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    console.log(`✓ 已删除 ${deletedCount} 个旧文件\n`);
  } else {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 将所有识别出的文本保存到一个txt文件中，用于检查正则提取结果
  const allTextsFilePath = join(OUTPUT_DIR, 'all_texts.txt');
  const allTextsContent = texts.map((text, index) => `${index + 1}. ${text}`).join('\n');
  writeFileSync(allTextsFilePath, allTextsContent, 'utf-8');
  console.log(`✓ 已生成文本列表文件: ${allTextsFilePath}\n`);

  // 将文本转换为安全的文件名
  function textToFileName(text: string, index: number): string {
    // 移除或替换文件名不允许的字符
    let fileName = text
      .replace(/[<>:"/\\|?*]/g, '') // 移除 Windows 不允许的字符
      .replace(/\s+/g, '_') // 空格替换为下划线
      .replace(/[，。！？、；：]/g, '') // 移除中文标点
      .trim();
    
    // 限制文件名长度（保留扩展名 .wav 的 4 个字符）
    const maxLength = 200;
    if (fileName.length > maxLength) {
      fileName = fileName.substring(0, maxLength);
    }
    
    // 如果文件名为空，使用索引
    if (!fileName) {
      fileName = `text_${String(index + 1).padStart(3, '0')}`;
    }
    
    return `${fileName}.wav`;
  }

  const maker = new AudioMaker({
    host: '127.0.0.1',
    port: 9880,
  });

  try {
    console.log('开始生成音频...');
    console.log(`文本语种: ${TEXT_LANG}`);
    console.log(`输出目录: ${OUTPUT_DIR}`);
    console.log(`切分符号: ${CUT_PUNC}`);
    console.log(`语速: ${SPEED}`);
    console.log(`top_k: ${TOP_K}, top_p: ${TOP_P}, temperature: ${TEMPERATURE}\n`);

    const outputFiles: string[] = [];

    // 为每个文本生成音频
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const fileName = textToFileName(text, i);
      const outputPath = join(OUTPUT_DIR, fileName);
      
      // 如果文件已存在，直接覆盖（因为已经清理过旧文件，理论上不应该存在）
      const finalPath = outputPath;

      console.log(`\n[${i + 1}/${texts.length}] 处理文本 ${i + 1}`);
      console.log(`内容: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);

      try {
        const audioBuffer = await maker.generateAudio({
          text: text,
          text_language: TEXT_LANG,
          cut_punc: CUT_PUNC,
          top_k: TOP_K,
          top_p: TOP_P,
          temperature: TEMPERATURE,
          speed: SPEED,
        });

        writeFileSync(finalPath, audioBuffer);
        const fileSize = statSync(finalPath).size;
        
        console.log(`✓ 音频生成成功!`);
        console.log(`  保存路径: ${finalPath}`);
        console.log(`  文件大小: ${(fileSize / 1024).toFixed(2)} KB`);

        outputFiles.push(finalPath);
      } catch (error) {
        console.error(`✗ 文本 ${i + 1} 生成失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log(`\n✅ 成功生成 ${outputFiles.length}/${texts.length} 个音频文件`);
    console.log(`输出目录: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('❌ 错误:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
