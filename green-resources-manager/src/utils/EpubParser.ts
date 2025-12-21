/**
 * EPUB 解析工具类 - epubjs 0.3.x 兼容版本
 */
// 注意：epubjs 0.3.x 的 API
declare global {
	interface Window {
	  ePub: any;
	}
  }
  
  import ePub from 'epubjs';
  
  export interface EpubMetadata {
	title?: string;
	author?: string;
	description?: string;
	publisher?: string;
	publishDate?: string;
	language?: string;
	cover?: string;
	totalChapters?: number;
	totalWords?: number;
  }
  
  export interface EpubChapter {
	id: string;
	href: string;
	label: string;
	order: number;
	cfi?: string;
  }
  
  export class EpubParser {
	private book: any = null; // epubjs 0.3.x 的 Book 类型
	private filePath: string = '';
	private isReady: boolean = false;
  
	/**
	 * 加载 EPUB 文件 - 0.3.x 版本
	 * 注意：只能 open 一次，不能重复 open
	 * 在 Electron 环境中，优先使用 file:// URL，因为 epubjs 需要访问 ZIP 内部文件
	 */
	async loadEpub(filePath: string): Promise<void> {
	  try {
		this.filePath = filePath;
		
		console.log('开始加载 EPUB 文件:', filePath);
		
		// epubjs 0.3.x 需要能够访问 EPUB 文件的 ZIP 内部结构
		// 在 Electron 环境中，优先尝试 Blob URL，然后尝试 ArrayBuffer，最后回退到 file:// URL
		let epubSource: string | ArrayBuffer = filePath;
		let blobUrl: string | null = null;
		
		// 检查是否在 Electron 环境中
		if (window.electronAPI && window.electronAPI.readFileAsDataUrl) {
		  try {
			console.log('尝试加载 EPUB 文件...');
			
			// 方法1: 尝试使用 fetch 读取文件为 Blob，然后创建 Blob URL
			// 根据掘金文章，Blob URL 在 Electron 中可能更可靠
			const fileUrl = filePath.startsWith('file://') 
			  ? filePath 
			  : `file:///${filePath.replace(/\\/g, '/')}`;
			
			let blob: Blob | null = null;
			
			try {
			  const response = await fetch(fileUrl);
			  if (response.ok) {
				blob = await response.blob();
				// 验证 Blob 是否是有效的 EPUB 文件
				const view = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
				const isValidEpub = view[0] === 0x50 && view[1] === 0x4B && view[2] === 0x03 && view[3] === 0x04;
				if (isValidEpub) {
				  // 优先尝试 Blob URL（根据掘金文章，这可能更可靠）
				  blobUrl = URL.createObjectURL(blob);
				  epubSource = blobUrl;
				  console.log('成功使用 Blob URL 方式加载，文件大小:', blob.size, 'bytes');
				} else {
				  throw new Error('文件不是有效的 EPUB 格式（不是 ZIP 文件）');
				}
			  } else {
				throw new Error(`fetch 失败: ${response.status} ${response.statusText}`);
			  }
			} catch (fetchError) {
			  console.warn('fetch 方法失败，尝试使用 Data URL 转换:', fetchError);
			  
			  // 方法2: 使用 Data URL 转换为 Blob
			  const dataUrl = await window.electronAPI.readFileAsDataUrl(filePath);
			  if (dataUrl) {
				// 将 Data URL 转换为 Blob
				const response = await fetch(dataUrl);
				blob = await response.blob();
				// 验证 EPUB 文件格式
				const view = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
				const isValidEpub = view[0] === 0x50 && view[1] === 0x4B && view[2] === 0x03 && view[3] === 0x04;
				if (isValidEpub) {
				  blobUrl = URL.createObjectURL(blob);
				  epubSource = blobUrl;
				  console.log('成功使用 Data URL 转换为 Blob URL，文件大小:', blob.size, 'bytes');
				} else {
				  throw new Error('文件不是有效的 EPUB 格式（不是 ZIP 文件）');
				}
			  } else {
				throw new Error('无法读取文件为 Data URL');
			  }
			}
			
		  } catch (blobError) {
			console.warn('Blob URL 方法失败，尝试 ArrayBuffer 方式:', blobError);
			
			// 方法3: 尝试直接使用 ArrayBuffer
			try {
			  const fileUrl = filePath.startsWith('file://') 
				? filePath 
				: `file:///${filePath.replace(/\\/g, '/')}`;
			  
			  const response = await fetch(fileUrl);
			  if (response.ok) {
				const arrayBuffer = await response.arrayBuffer();
				const view = new Uint8Array(arrayBuffer.slice(0, 4));
				const isValidEpub = view[0] === 0x50 && view[1] === 0x4B && view[2] === 0x03 && view[3] === 0x04;
				if (isValidEpub) {
				  epubSource = arrayBuffer;
				  console.log('成功使用 ArrayBuffer 方式加载，文件大小:', arrayBuffer.byteLength, 'bytes');
				} else {
				  throw new Error('文件不是有效的 EPUB 格式');
				}
			  }
			} catch (arrayBufferError) {
			  console.warn('ArrayBuffer 方法也失败，将使用 file:// URL 方式:', arrayBufferError);
			  // 如果都失败，使用文件路径转换为 file:// URL
			  const normalizedPath = filePath.replace(/\\/g, '/');
			  if (normalizedPath.match(/^[A-Za-z]:/)) {
				epubSource = `file:///${normalizedPath}`;
			  } else {
				epubSource = `file://${normalizedPath}`;
			  }
			  console.log('回退到 file:// URL 方式:', epubSource);
			}
		  }
		} else {
		  // 非 Electron 环境，使用 URL
		  if (!filePath.startsWith('file://') && !filePath.startsWith('http://') && !filePath.startsWith('https://')) {
			const normalizedPath = filePath.replace(/\\/g, '/');
			if (normalizedPath.match(/^[A-Za-z]:/)) {
			  epubSource = `file:///${normalizedPath}`;
			} else {
			  epubSource = `file://${normalizedPath}`;
			}
			console.log('使用 file:// URL 方式加载:', epubSource);
		  } else {
			epubSource = filePath;
			console.log('使用提供的 URL 方式加载:', epubSource);
		  }
		}
		
		// 创建 epubjs 实例
		// 根据博客：epubjs 0.3.x 可以直接在构造函数中传入 URL，或使用 open 方法
		if (window && window.ePub) {
		  // 使用全局的 ePub
		  this.book = window.ePub();
		} else {
		  // 使用导入的 ePub
		  this.book = ePub();
		}
		
		// 验证 book 对象是否创建成功
		if (!this.book) {
		  throw new Error('无法创建 epubjs 实例，请检查 epubjs 是否正确加载');
		}
		
		// epubjs 0.3.x 使用 ready 事件
		await new Promise<void>((resolve, reject) => {
		  let isResolved = false;
		  const book = this.book; // 保存引用，避免 this.book 被设置为 null
		  
		  // 辅助函数：安全地移除事件监听器
		  const safeOff = (event: string, handler: any) => {
			if (book && typeof book.off === 'function') {
			  try {
				book.off(event, handler);
			  } catch (e) {
				console.warn(`移除事件监听器失败 (${event}):`, e);
			  }
			}
		  };
		  
		  const timeout = setTimeout(() => {
			if (!isResolved) {
			  isResolved = true;
			  // 清理 Blob URL
			  if (blobUrl) {
				URL.revokeObjectURL(blobUrl);
			  }
			  // 清理事件监听器
			  safeOff('ready', readyHandler);
			  safeOff('error', errorHandler);
			  reject(new Error('EPUB 加载超时（30秒）'));
			}
		  }, 30000); // 30秒超时
		  
		  // 监听 ready 事件
		  const readyHandler = () => {
			if (isResolved) return;
			isResolved = true;
			clearTimeout(timeout);
			this.isReady = true;
			console.log('EPUB 准备就绪');
			// 清理事件监听器
			safeOff('ready', readyHandler);
			safeOff('error', errorHandler);
			// 注意：不在这里清理 Blob URL，因为后续可能还需要使用
			resolve();
		  };
		  
		  // 监听 error 事件
		  const errorHandler = (error: any) => {
			if (isResolved) return;
			isResolved = true;
			clearTimeout(timeout);
			console.error('EPUB 加载错误:', error);
			console.error('错误详情:', {
			  message: error?.message,
			  error: error,
			  source: epubSource,
			  sourceType: typeof epubSource,
			  filePath: filePath,
			  bookExists: !!book
			});
			
			// 清理 Blob URL
			if (blobUrl) {
			  URL.revokeObjectURL(blobUrl);
			}
			// 清理事件监听器
			safeOff('ready', readyHandler);
			safeOff('error', errorHandler);
			reject(new Error(`EPUB 加载错误: ${error?.message || error || '未知错误'}`));
		  };
		  
		  // 先绑定事件监听器
		  if (book && typeof book.on === 'function') {
			book.on('ready', readyHandler);
			book.on('error', errorHandler);
		  } else {
			clearTimeout(timeout);
			reject(new Error('epubjs book 对象不支持事件监听'));
			return;
		  }
		  
		  // 然后调用 open
		  console.log('调用 book.open，源类型:', typeof epubSource, '是否为 ArrayBuffer:', epubSource instanceof ArrayBuffer);
		  if (epubSource instanceof ArrayBuffer) {
			console.log('ArrayBuffer 大小:', epubSource.byteLength, 'bytes');
		  }
		  
		  try {
			if (!book || typeof book.open !== 'function') {
			  throw new Error('epubjs book 对象没有 open 方法');
			}
			book.open(epubSource);
			console.log('book.open 调用成功，等待 ready 事件...');
		  } catch (openError: any) {
			if (isResolved) return;
			isResolved = true;
			clearTimeout(timeout);
			// 清理 Blob URL
			if (blobUrl) {
			  URL.revokeObjectURL(blobUrl);
			}
			// 清理事件监听器
			safeOff('ready', readyHandler);
			safeOff('error', errorHandler);
			reject(new Error(`打开 EPUB 文件失败: ${openError?.message || openError || '未知错误'}`));
		  }
		});
		
		// 保存 Blob URL 以便后续清理
		if (blobUrl) {
		  (this as any)._blobUrl = blobUrl;
		}
		
		console.log('EPUB 文件加载成功:', filePath);
	  } catch (error: any) {
		console.error('加载 EPUB 文件失败:', error);
		// 确保清理 Blob URL
		if ((this as any)._blobUrl) {
		  URL.revokeObjectURL((this as any)._blobUrl);
		  (this as any)._blobUrl = null;
		}
		throw new Error(`无法加载 EPUB 文件: ${error.message}`);
	  }
	}
  
	/**
	 * 获取 EPUB 元数据 - 0.3.x 版本
	 */
	async getMetadata(): Promise<EpubMetadata> {
	  if (!this.book || !this.isReady) {
		throw new Error('EPUB 文件未加载或未就绪');
	  }
  
	  try {
		// epubjs 0.3.x 的元数据在 packaging.metadata
		const metadata = this.book.packaging?.metadata || {};
		console.log('元数据:', metadata);
		
		const cover = await this.getCover();
		
		// 获取章节数量（从 navigation）
		const navigation = this.book.navigation;
		const totalChapters = navigation?.toc?.length || 0;
		
		// 计算总字数
		const totalWords = await this.calculateTotalWords();
  
		// 处理创作者信息（epubjs 0.3.x 可能是字符串或数组）
		let author = '';
		if (metadata.creator) {
		  if (Array.isArray(metadata.creator)) {
			author = metadata.creator.map((c: any) => c.name || c).join(', ');
		  } else if (typeof metadata.creator === 'string') {
			author = metadata.creator;
		  } else if (metadata.creator.name) {
			author = metadata.creator.name;
		  }
		}
  
		return {
		  title: metadata.title || '',
		  author: author,
		  description: metadata.description || '',
		  publisher: metadata.publisher || '',
		  publishDate: metadata.date || metadata.pubdate || '',
		  language: metadata.language || 'zh',
		  cover: cover || '',
		  totalChapters,
		  totalWords
		};
	  } catch (error) {
		console.error('获取 EPUB 元数据失败:', error);
		throw error;
	  }
	}
  
	/**
	 * 获取章节列表 - 0.3.x 版本
	 */
	async getChapters(): Promise<EpubChapter[]> {
	  if (!this.book || !this.isReady) {
		throw new Error('EPUB 文件未加载或未就绪');
	  }
  
	  try {
		const navigation = this.book.navigation;
		const chapters: EpubChapter[] = [];
  
		if (navigation && navigation.toc && Array.isArray(navigation.toc)) {
		  // 递归处理目录项
		  const processToc = (items: any[], startOrder: number = 0): number => {
			let order = startOrder;
			
			for (const item of items) {
			  if (item.href) {
				chapters.push({
				  id: item.id || `chapter-${order}`,
				  href: item.href,
				  label: item.label || `章节 ${order + 1}`,
				  order: order
				});
				order++;
			  }
			  
			  // 处理子项
			  if (item.subitems && item.subitems.length > 0) {
				order = processToc(item.subitems, order);
			  }
			}
			
			return order;
		  };
  
		  processToc(navigation.toc);
		} else {
		  // 如果没有目录，使用 spine
		  const spine = this.book.spine;
		  if (spine && spine.contents) {
			spine.contents.forEach((item: any, index: number) => {
			  chapters.push({
				id: item.id || `spine-${index}`,
				href: item.href,
				label: `章节 ${index + 1}`,
				order: index
			  });
			});
		  }
		}
  
		return chapters.sort((a, b) => a.order - b.order);
	  } catch (error) {
		console.error('获取章节列表失败:', error);
		throw error;
	  }
	}
  
	/**
	 * 获取章节内容 - 0.3.x 版本的正确方法
	 */
	async getChapterContent(chapterHref: string): Promise<string> {
	  if (!this.book || !this.isReady) {
		throw new Error('EPUB 文件未加载或未就绪');
	  }
  
	  try {
		console.log('获取章节内容:', chapterHref);
		
		// 方法1：使用 spine 的 get 方法
		const spine = this.book.spine;
		if (spine && spine.get) {
		  const item = spine.get(chapterHref);
		  if (item) {
			console.log('找到 spine 项:', item);
			
			// 加载章节
			const section = await item.load(this.book.load.bind(this.book));
			if (section && section.document) {
			  console.log('章节文档:', section.document);
			  
			  // 获取 HTML 内容
			  let html = '';
			  if (section.document.body) {
				html = section.document.body.innerHTML;
			  } else if (section.document.documentElement) {
				html = section.document.documentElement.innerHTML;
			  }
			  
			  if (html) {
				console.log('成功获取章节内容，长度:', html.length);
				return html;
			  }
			}
		  }
		}
		
		// 方法2：直接使用 book 的 load 方法
		console.log('尝试直接使用 book.load');
		const section = await this.book.load(chapterHref);
		if (section) {
		  console.log('直接加载的 section:', section);
		  
		  if (section.document) {
			const html = section.document.body 
			  ? section.document.body.innerHTML 
			  : section.document.innerHTML;
			
			if (html) {
			  console.log('直接加载成功');
			  return html;
			}
		  }
		}
		
		// 方法3：使用 iframe 渲染然后获取内容
		console.log('尝试使用 iframe 渲染');
		return await this.getChapterContentViaRender(chapterHref);
		
	  } catch (error) {
		console.error('获取章节内容失败:', error);
		throw new Error(`无法获取章节内容: ${error.message}`);
	  }
	}
  
	/**
	 * 通过渲染获取章节内容 - 备用方法
	 */
	private async getChapterContentViaRender(chapterHref: string): Promise<string> {
	  return new Promise((resolve, reject) => {
		// 创建隐藏的 iframe 来渲染章节
		const iframe = document.createElement('iframe');
		iframe.style.display = 'none';
		document.body.appendChild(iframe);
		
		// 创建新的 book 实例（不传参数，避免隐式 open）
		const tempBook = ePub();
		
		const timeout = setTimeout(() => {
		  if (document.body.contains(iframe)) {
			document.body.removeChild(iframe);
		  }
		  reject(new Error('渲染超时'));
		}, 30000);
		
		tempBook.on('ready', () => {
		  try {
			// 渲染到 iframe
			const rendition = tempBook.renderTo(iframe, {
			  width: '100%',
			  height: '100%'
			});
			
			rendition.on('displayed', () => {
			  try {
				// 获取渲染后的内容
				const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
				if (iframeDoc) {
				  const html = iframeDoc.body.innerHTML;
				  if (html) {
					clearTimeout(timeout);
					// 清理
					if (document.body.contains(iframe)) {
					  document.body.removeChild(iframe);
					}
					resolve(html);
					return;
				  }
				}
			  } catch (e) {
				console.warn('iframe 内容获取失败:', e);
			  }
			  
			  // 如果失败，尝试其他方法
			  clearTimeout(timeout);
			  if (document.body.contains(iframe)) {
				document.body.removeChild(iframe);
			  }
			  reject(new Error('无法通过渲染获取章节内容'));
			});
			
			// 显示指定章节
			rendition.display(chapterHref);
		  } catch (renderError) {
			clearTimeout(timeout);
			if (document.body.contains(iframe)) {
			  document.body.removeChild(iframe);
			}
			reject(new Error(`渲染失败: ${renderError.message || renderError}`));
		  }
		});
		
		tempBook.on('error', (error: any) => {
		  clearTimeout(timeout);
		  if (document.body.contains(iframe)) {
			document.body.removeChild(iframe);
		  }
		  reject(new Error(`渲染失败: ${error.message || error}`));
		});
		
		// 只 open 一次
		tempBook.open(this.filePath);
	  });
	}
  
	/**
	 * 获取封面图片
	 */
	async getCover(): Promise<string | null> {
	  if (!this.book || !this.isReady) {
		return null;
	  }
  
	  try {
		// epubjs 0.3.x 获取封面的方法
		const coverUrl = await this.book.coverUrl();
		if (coverUrl) {
		  // 转换为 base64
		  const response = await fetch(coverUrl);
		  if (response.ok) {
			const blob = await response.blob();
			return new Promise((resolve, reject) => {
			  const reader = new FileReader();
			  reader.onloadend = () => resolve(reader.result as string);
			  reader.onerror = reject;
			  reader.readAsDataURL(blob);
			});
		  }
		}
		return null;
	  } catch (error) {
		console.warn('获取封面失败:', error);
		return null;
	  }
	}
  
	/**
	 * 获取指定章节索引的内容
	 */
	async getChapterByIndex(index: number): Promise<string> {
	  if (!this.book || !this.isReady) {
		throw new Error('EPUB 文件未加载或未就绪');
	  }
  
	  try {
		// 先获取所有章节
		const chapters = await this.getChapters();
		if (index < 0 || index >= chapters.length) {
		  throw new Error('章节索引超出范围');
		}
		
		return await this.getChapterContent(chapters[index].href);
	  } catch (error) {
		console.error('获取指定章节失败:', error);
		throw error;
	  }
	}
  
	/**
	 * 计算总字数
	 */
	async calculateTotalWords(): Promise<number> {
	  if (!this.book || !this.isReady) {
		return 0;
	  }
  
	  try {
		const chapters = await this.getChapters();
		let totalWords = 0;
		const maxChapters = Math.min(chapters.length, 5); // 只检查前5章提高性能
		
		for (let i = 0; i < maxChapters; i++) {
		  try {
			const content = await this.getChapterContent(chapters[i].href);
			const text = this.extractTextFromHtml(content);
			totalWords += this.countWords(text);
		  } catch (error) {
			console.warn(`统计第 ${i + 1} 章字数失败:`, error);
		  }
		}
		
		// 估算总字数
		if (chapters.length === 0) return 0;
		const avgWordsPerChapter = totalWords / maxChapters;
		return Math.round(avgWordsPerChapter * chapters.length);
	  } catch (error) {
		console.error('计算总字数失败:', error);
		return 0;
	  }
	}
  
	/**
	 * 从 HTML 中提取纯文本
	 */
	private extractTextFromHtml(html: string): string {
	  const div = document.createElement('div');
	  div.innerHTML = html;
	  
	  // 移除脚本和样式
	  const scripts = div.getElementsByTagName('script');
	  const styles = div.getElementsByTagName('style');
	  
	  Array.from(scripts).forEach(script => script.remove());
	  Array.from(styles).forEach(style => style.remove());
	  
	  return div.textContent || div.innerText || '';
	}
  
	/**
	 * 统计中文字数
	 */
	private countWords(text: string): number {
	  // 中文字符统计
	  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
	  const chineseCount = chineseChars ? chineseChars.length : 0;
	  
	  // 英文单词统计（按空格分割）
	  const englishWords = text.match(/[a-zA-Z]+/g);
	  const englishCount = englishWords ? englishWords.length : 0;
	  
	  return chineseCount + englishCount;
	}
  
	/**
	 * 释放资源
	 */
	destroy(): void {
	  // 清理 Blob URL
	  if ((this as any)._blobUrl) {
		URL.revokeObjectURL((this as any)._blobUrl);
		(this as any)._blobUrl = null;
	  }
	  
	  if (this.book) {
		// epubjs 0.3.x 可能没有明确的销毁方法
		// 可以尝试调用相关方法
		if (typeof this.book.destroy === 'function') {
		  this.book.destroy();
		}
		this.book = null;
	  }
	  this.isReady = false;
	  this.filePath = '';
	}
  }