import generateAudio, { AudioMaker } from './audio-maker';
import { join } from 'path';

async function main() {
  // ========== 配置：修改这里的路径 ==========
  const TEXT_FILE = join(__dirname, 'test.txt'); // 文本文件
  const OUTPUT_DIR = join(__dirname, 'output'); // 输出目录
  
  // ⚠️ 重要提示：
  // 启动 API 时必须指定模型路径（-g 和 -s 参数），否则会报 KeyError: 'default' 错误
  // 完整启动命令示例：
  //   python api.py -a 127.0.0.1 -p 9880 -g "GPT_weights_v2/me-e15.ckpt" -s "SoVITS_weights_v2/me_e8_s136.pth" -dr "test.wav" -dt "参考文本" -dl "zh"
  // 注意：参考音频已在启动 API 时通过 -dr, -dt, -dl 参数指定，此处无需再传
  
  // ========== 文本配置 ==========
  const TEXT_LANG = 'auto'; // 需要合成的语种：'zh'（中文）、'zh_mix_en'（中英混合）、'en'（英文）等
  
  // 文本切分符号 (v1 API 使用 cut_punc，如 "，。？！" 等标点符号)
  const CUT_PUNC = '，。？！'; // 用于切分文本的标点符号
  
  // 语速
  const SPEED = 1.0; // 语速（默认: 1.0，高为更快）
  
  // 采样参数（v1 API 默认值：top_k=15, top_p=1.0, temperature=1.0）
  const TOP_K = 23;      // top k sampling (默认: 15)
  const TOP_P = 0.95;    // top p sampling (默认: 1.0)
  const TEMPERATURE = 1.0; // temperature (默认: 1.0)
  // ==========================================

  const maker = new AudioMaker({
    host: '127.0.0.1',
    port: 9880,
  });

  try {
    console.log('开始生成音频...');
    console.log(`文本文件: ${TEXT_FILE}`);
    console.log(`文本语种: ${TEXT_LANG}`);
    console.log(`输出目录: ${OUTPUT_DIR}`);
    console.log(`切分符号: ${CUT_PUNC}`);
    console.log(`语速: ${SPEED}`);
    console.log(`top_k: ${TOP_K}, top_p: ${TOP_P}, temperature: ${TEMPERATURE}\n`);

    const files = await maker.generateAndSave({
      textFile: TEXT_FILE,
      outputDir: OUTPUT_DIR,
      splitBySection: true,
      speed: SPEED,
      cutPunc: CUT_PUNC,  // v1 API 使用 cut_punc
      textLang: TEXT_LANG,       // 需要合成的语种
      top_k: TOP_K,
      top_p: TOP_P,
      temperature: TEMPERATURE,
    });

    console.log(`\n✅ 成功生成 ${files.length} 个音频文件`);
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
  } catch (error) {
    console.error('❌ 错误:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
