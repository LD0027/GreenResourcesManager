/**
 * GPT-SoVITS API v1 音频生成工具
 * 用于调用 GPT-SoVITS API v1 (api.py) 生成语音音频文件
 * 
 * 使用前请确保:
 * 1. 已安装 @types/node: npm install --save-dev @types/node
 * 2. GPT-SoVITS API v1 服务已启动
 * 
 * 完整启动（指定模型和默认参考音频）:
 *   D:\ai\GPT-SoVITS-beta\GPT-SoVITS-v3lora-20250228\runtime\python.exe api.py -a 127.0.0.1 -p 9880 -g "GPT_weights_v2/me-e15.ckpt" -s "SoVITS_weights_v2/me_e8_s136.pth" -dr "my_refer/test.wav" -dt "大家好，我是孔昙，一名游戏设计师，我主要从事游戏的玩法与系统设计。" -dl "zh"
 * 
 * 参数说明:
 *   -g / --gpt_path: GPT模型路径
 *   -s / --sovits_path: SoVITS模型路径
 *   -dr / --default_refer_path: 默认参考音频路径
 *   -dt / --default_refer_text: 默认参考音频文本
 *   -dl / --default_refer_language: 默认参考音频语种 ("zh", "en", "ja", "ko", "yue" 等)
 *   -a / --bind_addr: 绑定地址 (默认: 0.0.0.0)
 *   -p / --port: 绑定端口 (默认: 9880)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { dirname, basename, extname, join } from 'path';

// API 配置接口
interface APIConfig {
  host: string;
  port: number;
  baseUrl: string;
}

// TTS 请求参数接口 (v1 API)
interface TTSRequest {
  refer_wav_path?: string;  // v1 使用 refer_wav_path（可选，如果启动 API 时已指定默认值）
  prompt_text?: string;  // 可选，如果启动 API 时已指定默认值
  prompt_language?: string;  // v1 使用 prompt_language（可选，如果启动 API 时已指定默认值）
  text: string;
  text_language: string;  // v1 使用 text_language
  cut_punc?: string;  // v1 使用 cut_punc 控制文本切分
  top_k?: number;
  top_p?: number;
  temperature?: number;
  speed?: number;  // v1 使用 speed
  inp_refs?: string[];  // 可选的多参考音频
}

// 生成选项接口
interface GenerateOptions {
  text?: string;
  textFile?: string;
  refAudio?: string;  // 可选，如果启动 API 时已指定默认参考音频
  output?: string;
  outputDir?: string;
  splitBySection?: boolean;
  speed?: number;
  cutPunc?: string;  // 文本切分符号，如 "，。？！"
  promptText?: string;  // 参考音频的文本（可选，如果启动 API 时已指定默认值）
  promptLang?: string;  // 参考音频的语种（默认: 'zh'，如果启动 API 时已指定默认值则不需要）
  textLang?: string;  // 需要合成的语种（默认: 'zh'）
  top_k?: number;  // top k sampling (默认: 15)
  top_p?: number;  // top p sampling (默认: 1.0)
  temperature?: number;  // temperature for sampling (默认: 1.0)
}

// 默认配置
const DEFAULT_CONFIG: APIConfig = {
  host: '127.0.0.1',
  port: 9880,
  baseUrl: 'http://127.0.0.1:9880',
};

class AudioMaker {
  private config: APIConfig;

  constructor(config?: Partial<APIConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.config.baseUrl = `http://${this.config.host}:${this.config.port}`;
  }

  /**
   * 检查文件是否存在
   */
  private checkFileExists(filePath: string): boolean {
    return existsSync(filePath);
  }

  /**
   * 确保目录存在
   */
  private ensureDir(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * 读取文本文件
   */
  private readTextFile(filePath: string): string {
    if (!this.checkFileExists(filePath)) {
      throw new Error(`文本文件不存在: ${filePath}`);
    }
    return readFileSync(filePath, 'utf-8');
  }

  /**
   * 将文本按段落分割
   */
  private splitTextBySections(text: string): string[] {
    const sections: string[] = [];
    const lines = text.split('\n');
    let currentSection: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (currentSection.length > 0) {
          sections.push(currentSection.join('\n'));
          currentSection = [];
        }
      } else {
        currentSection.push(line);
      }
    }

    if (currentSection.length > 0) {
      sections.push(currentSection.join('\n'));
    }

    return sections.filter(section => section.trim().length > 0);
  }

  /**
   * 调用 GPT-SoVITS API v1 生成音频
   */
  async generateAudio(options: TTSRequest): Promise<Buffer> {
    const url = `${this.config.baseUrl}/`;  // v1 使用根路径

    // 如果提供了参考音频路径，检查文件是否存在
    if (options.refer_wav_path && !this.checkFileExists(options.refer_wav_path)) {
      throw new Error(`参考音频文件不存在: ${options.refer_wav_path}`);
    }

    // 检查模型是否已加载（如果请求失败且包含 KeyError，说明模型未加载）
    // 注意：这个检查可能会增加一次请求，但可以提前发现模型未加载的问题

    // 构建请求参数 (v1 API)
    const params = new URLSearchParams();
    
    // 参考音频参数（可选，如果启动 API 时已指定默认值可以不传）
    if (options.refer_wav_path) {
      params.append('refer_wav_path', options.refer_wav_path);
    }
    if (options.prompt_text) {
      params.append('prompt_text', options.prompt_text);
    }
    if (options.prompt_language) {
      params.append('prompt_language', options.prompt_language);
    }
    
    // 必需参数
    params.append('text', options.text);
    params.append('text_language', options.text_language);
    
    if (options.cut_punc) {
      params.append('cut_punc', options.cut_punc);
    }
    
    if (options.top_k !== undefined) params.append('top_k', String(options.top_k));
    if (options.top_p !== undefined) params.append('top_p', String(options.top_p));
    if (options.temperature !== undefined) params.append('temperature', String(options.temperature));
    if (options.speed !== undefined) params.append('speed', String(options.speed));
    
    // 多参考音频（可选）
    if (options.inp_refs && options.inp_refs.length > 0) {
      options.inp_refs.forEach(ref => {
        params.append('inp_refs', ref);
      });
    }

    try {
      console.log(`正在生成音频...`);
      console.log(`文本长度: ${options.text.length} 字符`);
      if (options.refer_wav_path) {
        console.log(`参考音频: ${options.refer_wav_path}`);
      } else {
        console.log(`使用 API 默认参考音频`);
      }

      const response = await fetch(`${url}?${params.toString()}`);

      if (!response.ok) {
        const errorText = await response.text();
        let errorInfo;
        try {
          errorInfo = JSON.parse(errorText);
        } catch {
          errorInfo = { message: errorText };
        }
        
        // 检查是否是模型未加载的错误
        if (errorText.includes("KeyError") && errorText.includes("default")) {
          throw new Error(
            `模型未加载！请检查启动 API 时的日志，确保模型路径正确且模型文件存在。\n` +
            `启动命令示例：python api.py -a 127.0.0.1 -p 9880 -g "GPT_weights_v3/me-e15.ckpt" -s "SoVITS_weights_v3/me_e1_s62_l32.pth"\n` +
            `原始错误: ${errorText}`
          );
        }
        
        throw new Error(`API 请求失败 (${response.status}): ${JSON.stringify(errorInfo)}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(
          `无法连接到 API 服务器 ${this.config.baseUrl}\n` +
          `请确保 GPT-SoVITS API v1 服务已启动\n` +
          `启动命令: python api.py -a ${this.config.host} -p ${this.config.port} -g "模型路径" -s "模型路径"`
        );
      }
      // 如果错误信息中包含 "terminated"，可能是模型未加载导致的
      if (error instanceof Error && error.message.includes('terminated')) {
        throw new Error(
          `请求被终止，可能是模型未正确加载。\n` +
          `请检查启动 API 时的日志，确保：\n` +
          `1. 模型路径正确（-g 和 -s 参数）\n` +
          `2. 模型文件存在且未损坏\n` +
          `3. 启动时没有模型加载错误\n` +
          `原始错误: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * 生成音频并保存到文件
   */
  async generateAndSave(options: GenerateOptions): Promise<string[]> {
    const outputFiles: string[] = [];

    // 确定文本内容
    let text: string;
    if (options.text) {
      text = options.text;
    } else if (options.textFile) {
      text = this.readTextFile(options.textFile);
    } else {
      throw new Error('必须提供 text 或 textFile 参数');
    }

    // 检查参考音频（如果提供了）
    if (options.refAudio && !this.checkFileExists(options.refAudio)) {
      throw new Error(`参考音频文件不存在: ${options.refAudio}`);
    }

    // 确定输出路径
    const shouldSplit = options.splitBySection ?? false;
    let outputPath: string | undefined;
    let outputDir: string | undefined;

    if (options.output) {
      try {
        const stats = statSync(options.output);
        if (shouldSplit && stats.isDirectory()) {
          outputDir = options.output;
        } else if (shouldSplit) {
          outputDir = dirname(options.output);
        } else {
          outputPath = options.output;
        }
      } catch {
        // 文件不存在，判断为文件路径
        if (shouldSplit) {
          outputDir = dirname(options.output);
        } else {
          outputPath = options.output;
        }
      }
    } else if (options.outputDir) {
      outputDir = options.outputDir;
    } else if (options.textFile) {
      const baseName = basename(options.textFile, extname(options.textFile));
      outputDir = join(dirname(options.textFile), 'output');
    } else {
      outputDir = './output';
    }

    if (outputDir) {
      this.ensureDir(outputDir);
    }

    // 处理文本
    if (shouldSplit) {
      const sections = this.splitTextBySections(text);
      console.log(`找到 ${sections.length} 个段落，将分别生成音频文件\n`);

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (!section.trim()) continue;

        const fileName = `part_${String(i + 1).padStart(2, '0')}.wav`;
        const filePath = join(outputDir!, fileName);

        console.log(`\n[${i + 1}/${sections.length}] 处理段落 ${i + 1}`);
        console.log(`内容预览: ${section.substring(0, 50)}...`);

        try {
          const audioBuffer = await this.generateAudio({
            refer_wav_path: options.refAudio,
            prompt_text: options.promptText,
            prompt_language: options.promptLang,
            text: section,
            text_language: options.textLang || 'zh',
            cut_punc: options.cutPunc,
            top_k: options.top_k,
            top_p: options.top_p,
            temperature: options.temperature,
            speed: options.speed || 1.0,
          });

          writeFileSync(filePath, audioBuffer);
          const fileSize = statSync(filePath).size;
          console.log(`✓ 音频生成成功!`);
          console.log(`  保存路径: ${filePath}`);
          console.log(`  文件大小: ${(fileSize / 1024).toFixed(2)} KB`);

          outputFiles.push(filePath);
        } catch (error) {
          console.error(`✗ 段落 ${i + 1} 生成失败: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } else {
      // 生成单个文件
      if (!outputPath) {
        const baseName = options.textFile
          ? basename(options.textFile, extname(options.textFile))
          : 'output';
        outputPath = join(outputDir || './', `${baseName}_full.wav`);
      }

      const dir = dirname(outputPath);
      if (dir) {
        this.ensureDir(dir);
      }

      console.log(`生成完整音频文件...`);

      const audioBuffer = await this.generateAudio({
        refer_wav_path: options.refAudio,
        prompt_text: options.promptText,
        prompt_language: options.promptLang,
        text: text,
        text_language: options.textLang || 'zh',
        cut_punc: options.cutPunc,
        top_k: options.top_k,
        top_p: options.top_p,
        temperature: options.temperature,
        speed: options.speed || 1.0,
      });

      writeFileSync(outputPath, audioBuffer);
      const fileSize = statSync(outputPath).size;
      console.log(`✓ 音频生成成功!`);
      console.log(`  保存路径: ${outputPath}`);
      console.log(`  文件大小: ${(fileSize / 1024).toFixed(2)} KB`);

      outputFiles.push(outputPath);
    }

    return outputFiles;
  }

  /**
   * 检查模型是否已加载（通过尝试生成一个测试请求）
   */
  async checkModelLoaded(): Promise<boolean> {
    try {
      // 尝试调用一个简单的请求来检查模型是否已加载
      // 如果模型未加载，会返回 KeyError: 'default'
      const testUrl = `${this.config.baseUrl}/?text=test&text_language=zh`;
      const response = await fetch(testUrl);
      // 如果返回 400 且包含 "default" 错误，说明模型未加载
      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes("default") || errorText.includes("KeyError")) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 切换模型 (v1 API 需要同时切换 GPT 和 SoVITS)
   */
  async setModel(gptWeightsPath: string, sovitsWeightsPath: string): Promise<void> {
    const url = `${this.config.baseUrl}/set_model`;
    // 确保路径格式正确（Windows 路径转换为正斜杠）
    const normalizedGptPath = gptWeightsPath.replace(/\\/g, '/');
    const normalizedSovitsPath = sovitsWeightsPath.replace(/\\/g, '/');
    // 使用 URLSearchParams 确保正确编码
    const params = new URLSearchParams();
    params.set('gpt_model_path', normalizedGptPath);
    params.set('sovits_model_path', normalizedSovitsPath);
    const fullUrl = `${url}?${params.toString()}`;

    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorInfo;
      try {
        errorInfo = JSON.parse(errorText);
      } catch {
        errorInfo = { message: errorText };
      }
      throw new Error(`切换模型失败: ${JSON.stringify(errorInfo)}`);
    }

    // v1 API 返回 JSON 格式 {"code": 0, "message": "Success"} 或 {"code": 400, "message": "..."}
    const resultText = await response.text();
    try {
      const result = JSON.parse(resultText);
      if (result.code === 0) {
        return; // 成功
      }
      throw new Error(`切换模型失败: ${result.message || resultText}`);
    } catch (parseError) {
      throw new Error(`切换模型失败: ${resultText}`);
    }
  }

  /**
   * 切换 GPT 模型 (兼容方法，实际调用 setModel)
   */
  async setGPTWeights(weightsPath: string): Promise<void> {
    throw new Error('v1 API 不支持单独切换 GPT 模型，请使用 setModel(gptPath, sovitsPath) 同时切换两个模型');
  }

  /**
   * 切换 SoVITS 模型 (兼容方法，实际调用 setModel)
   */
  async setSoVITSWeights(weightsPath: string): Promise<void> {
    throw new Error('v1 API 不支持单独切换 SoVITS 模型，请使用 setModel(gptPath, sovitsPath) 同时切换两个模型');
  }
}

// 导出类和默认实例
export { AudioMaker, GenerateOptions, TTSRequest, APIConfig };

// 默认导出函数，方便使用
export default async function generateAudio(options: GenerateOptions & { config?: Partial<APIConfig> }): Promise<string[]> {
  const { config, ...generateOptions } = options;
  const maker = new AudioMaker(config);
  return maker.generateAndSave(generateOptions);
}

// 如果作为脚本直接运行（Node.js 环境）
if (typeof require !== 'undefined' && require.main === module) {
  // 命令行使用示例
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
GPT-SoVITS 音频生成工具

用法:
  ts-node audio-maker.ts [选项]

选项:
  --text <文本>              要合成的文本
  --file <文件路径>          从文本文件读取
  --ref-audio <路径>         参考音频文件路径（必需）
  --output <路径>            输出文件路径或目录
  --split                    按段落分割生成多个音频文件
  --speed <数值>             语速因子（默认: 1.0）
  --host <地址>              API 服务器地址（默认: 127.0.0.1）
  --port <端口>              API 服务器端口（默认: 9880）
  --prompt-text <文本>       提示文本（可选）

示例:
  # 从文件生成单个音频
  ts-node audio-maker.ts --file 测试.txt --ref-audio ref.wav --output output.wav

  # 从文件按段落分割生成
  ts-node audio-maker.ts --file 测试.txt --ref-audio ref.wav --split

  # 直接使用文本生成
  ts-node audio-maker.ts --text "你好，这是一段测试" --ref-audio ref.wav --output test.wav
    `);
    process.exit(0);
  }

  // 解析命令行参数
  const options: GenerateOptions & { config?: Partial<APIConfig> } = {
    refAudio: '',
    config: {},
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--text':
        if (nextArg) options.text = nextArg;
        i++;
        break;
      case '--file':
        if (nextArg) options.textFile = nextArg;
        i++;
        break;
      case '--ref-audio':
        if (nextArg) options.refAudio = nextArg;
        i++;
        break;
      case '--output':
        if (nextArg) options.output = nextArg;
        i++;
        break;
      case '--split':
        options.splitBySection = true;
        break;
      case '--speed':
        if (nextArg) options.speed = parseFloat(nextArg);
        i++;
        break;
      case '--host':
        if (nextArg) options.config!.host = nextArg;
        i++;
        break;
      case '--port':
        if (nextArg) options.config!.port = parseInt(nextArg);
        i++;
        break;
      case '--prompt-text':
        if (nextArg) options.promptText = nextArg;
        i++;
        break;
    }
  }

  if (!options.refAudio) {
    console.error('错误: 必须提供 --ref-audio 参数');
    process.exit(1);
  }

  if (!options.text && !options.textFile) {
    console.error('错误: 必须提供 --text 或 --file 参数');
    process.exit(1);
  }

  generateAudio(options)
    .then((files) => {
      console.log(`\n✓ 所有音频生成完成! 共生成 ${files.length} 个文件`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(`\n✗ 发生错误: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    });
}
