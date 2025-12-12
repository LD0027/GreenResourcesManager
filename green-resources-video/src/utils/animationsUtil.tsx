import { Layout, Img, Txt, Rect, Node } from '@motion-canvas/2d';
import { createRef, all, ThreadGenerator, waitFor, easeOutCubic, spawn } from '@motion-canvas/core';
import VideoPostion from './VideoPostion';
import { TreeNodeRefs, TreeNodeData, TreeNodeTheme, addNodeTo, addNodesTo, removeNode, removeNodeChildren } from '../nodes/TreeNode';

/**
 * 让任意节点移动到目标位置，同时淡入
 * @param nodeRef 节点引用（可以是 Img、Txt、Rect、Layout 等任意 Node 类型）
 * @param view 场景视图引用（用于获取屏幕尺寸，当前未使用但保留以备扩展）
 * @param targetPosition 目标位置 [x, y]
 * @param duration 动画持续时间（秒），默认1秒
 * @returns ThreadGenerator 可以 yield* 来等待动画完成
 */
export function* moveAndShow<T extends Node>(
	nodeRef: ReturnType<typeof createRef<T>>,
	view: Layout,
	targetPosition: [number, number],
	duration: number = 1
): ThreadGenerator {
	// 从屏幕下方移动到目标位置，同时淡入
	yield* all(
		nodeRef().position(targetPosition, duration), // 移动到目标位置
		nodeRef().opacity(1, duration) // 同时淡入
	);
}

/**
 * 隐藏并删除节点（淡出后删除）
 * @param nodeRef 节点引用（可以是 Img、Txt、Rect、Layout 等任意 Node 类型）
 * @param duration 淡出动画持续时间（秒），默认0.5秒
 * @param waitTime 删除前等待时间（秒），默认0.1秒
 * @returns ThreadGenerator 可以 yield* 来等待动画完成
 */
export function* hideAndRemove<T extends Node>(
	nodeRef: ReturnType<typeof createRef<T>>,
	duration: number = 0.5,
	waitTime: number = 0.1
): ThreadGenerator {
	const node = nodeRef();
	if (!node) return;
	
	// 淡出
	yield* node.opacity(0, duration, easeOutCubic);
	
	// 等待一小段时间
	yield* waitFor(waitTime);
	
	// 删除节点
	node.remove();
}



/**
 * 淡入节点列表
 * @param nodeRefs 节点引用数组
 * @returns ThreadGenerator 可以 yield* 来等待动画完成
 */
export function* fadeInNodes<T extends Node>(
	nodeRefs: ReturnType<typeof createRef<T>>[],
	duration: number = 0.5
): ThreadGenerator {
	// 文本依次淡入
	for (let i = 0; i < nodeRefs.length; i++) {
		yield* nodeRefs[i]().opacity(1, duration);
	}
}

/**
 * 让节点列表像被黑洞吸走一样，旋转缩小移动到目标位置
 * 注意：节点应该已经在场景根层级（不在 Layout 容器中），否则无法自由移动
 * @param nodeRefs 节点引用数组
 * @param targetRef 目标节点引用（黑洞中心）
 * @param duration 动画持续时间（秒），默认1.5秒
 * @param rotationSpeed 旋转速度（圈数），默认3圈
 * @returns ThreadGenerator 可以 yield* 来等待动画完成
 */
export function* blackHoleEffect<T extends Node>(
	nodeRefs: ReturnType<typeof createRef<T>>[],
	targetRef: ReturnType<typeof createRef<Node>>,
	duration: number = 1.5,
	rotationSpeed: number = 3
): ThreadGenerator {
	// 获取目标节点的绝对位置
	const targetNode = targetRef();
	const targetAbsolutePos = targetNode.absolutePosition();
	
	// 等待一帧，确保位置计算完成
	yield* waitFor(0);
	
	// 为每个节点创建动画生成器函数
	const animations: ThreadGenerator[] = nodeRefs.map((nodeRef, index) => {
		// 添加随机延迟，让效果更自然（0-0.2秒的随机延迟）
		const delay = (index / nodeRefs.length) * 0.2;
		
		return (function* (): ThreadGenerator {
			// 等待延迟
			if (delay > 0) {
				yield* waitFor(delay);
			}
			
			const node = nodeRef();
			
			// 同时执行：旋转、缩放、移动、淡出
			// 节点应该在场景根层级，可以直接使用绝对位置
			yield* all(
				node.rotation(node.rotation() + rotationSpeed * 360, duration), // 旋转
				node.scale(0, duration), // 缩小到0
				node.absolutePosition(targetAbsolutePos, duration), // 移动到目标位置（绝对位置）
				node.opacity(0, duration * 0.8) // 在接近时淡出（提前一点淡出）
			);
		})();
	});
	
	// 同时执行所有节点的动画
	yield* all(...animations);
	
	// 动画结束后删除所有节点
	for (const nodeRef of nodeRefs) {
		const node = nodeRef();
		if (node) {
			node.remove();
		}
	}
}

/**
 * 持久关键词容器引用（用于跨字幕保持显示）
 * 使用 WeakMap 来为每个 view 创建独立的容器
 */
const persistentKeywordsContainers = new WeakMap<Layout, ReturnType<typeof createRef<Layout>>>();
const keywordRefs = new WeakMap<Layout, Map<string, {
	layoutRef: ReturnType<typeof createRef<Layout>>;
	titleRef: ReturnType<typeof createRef<Txt>>;
	contentRef: ReturnType<typeof createRef<Txt>>;
}>>();

/**
 * 在屏幕顶部显示持久关键词（不会消失）
 * 支持标题和内容两种样式，标题字体大，内容字体小，都在同一个框内
 * @param view 场景视图引用
 * @param keyword 要添加的关键词（标题）
 * @param content 可选的内容文本（小字体）
 * @returns ThreadGenerator 可以 yield* 来等待动画完成
 */
export function* showPersistentKeyword(
	view: Layout,
	keyword: string,
	content?: string
): ThreadGenerator {
	// 获取或创建主容器引用
	let containerRef = persistentKeywordsContainers.get(view);
	
	// 如果容器不存在，创建容器
	if (!containerRef) {
		containerRef = createRef<Layout>();
		persistentKeywordsContainers.set(view, containerRef);
		
		const container = (
			<Layout
				ref={containerRef}
				layout
				direction="column"
				alignItems="center"
				justifyContent="center"
				position={() => VideoPostion.innerTopCenter(view)}
				opacity={1}
				zIndex={200}
				gap={20}
			/>
		);
		view.add(container);
	}

	// 获取或创建关键词引用映射
	let keywordMap = keywordRefs.get(view);
	if (!keywordMap) {
		keywordMap = new Map();
		keywordRefs.set(view, keywordMap);
	}

	// 检查是否已存在该关键词
	const existingRefs = keywordMap.get(keyword);
	
	if (existingRefs) {
		// 如果已存在，更新内容
		if (content) {
			// 如果内容文本组件不存在，需要创建它
			const rect = existingRefs.layoutRef().children()[0] as Rect;
			if (!existingRefs.contentRef || rect.children().length === 1) {
				// 创建内容文本组件
				const contentTxt = (
					<Txt
						ref={existingRefs.contentRef}
						text=""
						fontSize={32}
						fill="#ffffff"
						fontFamily="Microsoft YaHei, sans-serif"
						textAlign="center"
						fontWeight={400}
						opacity={0.9}
					/>
				);
				rect.add(contentTxt);
			}
			// 打字机效果：逐字显示
			yield* typewriterEffect(existingRefs.contentRef, content);
		}
		// 淡入动画（如果之前是隐藏的）
		if (existingRefs.layoutRef().opacity() < 1) {
			yield* existingRefs.layoutRef().opacity(1, 0.5);
		}
	} else {
		// 创建新的关键词容器（包含标题和内容）
		const keywordLayoutRef = createRef<Layout>();
		const titleRef = createRef<Txt>();
		const contentRef = createRef<Txt>();
		
		const keywordContainer = (
			<Layout
				ref={keywordLayoutRef}
				layout
				direction="column"
				alignItems="center"
				justifyContent="center"
				opacity={0}
				gap={12}
			>
				<Rect
					fill="#000000"
					opacity={0.7}
					radius={8}
					padding={[20, 30]}
					layout
					direction="column"
					gap={12}
				>
					{/* 标题 - 大字体 */}
					<Txt
						ref={titleRef}
						text={keyword}
						fontSize={48}
						fill="#ffffff"
						fontFamily="Microsoft YaHei, sans-serif"
						textAlign="center"
						fontWeight={700}
					/>
					{/* 内容 - 小字体（如果提供） */}
					{content && (
						<Txt
							ref={contentRef}
							text=""
							fontSize={32}
							fill="#ffffff"
							fontFamily="Microsoft YaHei, sans-serif"
							textAlign="center"
							fontWeight={400}
							opacity={0.9}
						/>
					)}
				</Rect>
			</Layout>
		);

		containerRef().add(keywordContainer);
		
		// 保存引用
		keywordMap.set(keyword, {
			layoutRef: keywordLayoutRef,
			titleRef: titleRef,
			contentRef: contentRef,
		});

		// 淡入动画
		yield* keywordLayoutRef().opacity(1, 0.5);
		
		// 如果有内容，使用打字机效果显示
		if (content && contentRef) {
			yield* typewriterEffect(contentRef, content);
		}
	}
}

/**
 * 清除所有持久关键词（淡出并删除）
 * @param view 场景视图引用
 * @param duration 淡出持续时间（秒），默认 0.5
 * @returns ThreadGenerator 可以 yield* 来等待动画完成
 */
export function* clearPersistentKeywords(
	view: Layout,
	duration: number = 0.5
): ThreadGenerator {
	const containerRef = persistentKeywordsContainers.get(view);
	const keywordMap = keywordRefs.get(view);
	
	if (!containerRef || !keywordMap) {
		return; // 如果没有关键词，直接返回
	}
	
	// 淡出所有关键词
	const fadeOutAnimations: ThreadGenerator[] = [];
	for (const refs of keywordMap.values()) {
		fadeOutAnimations.push(refs.layoutRef().opacity(0, duration));
	}
	
	// 同时淡出所有关键词
	if (fadeOutAnimations.length > 0) {
		yield* all(...fadeOutAnimations);
	}
	
	// 移除所有关键词元素
	for (const refs of keywordMap.values()) {
		refs.layoutRef().remove();
	}
	
	// 清理引用映射
	keywordMap.clear();
	
	// 移除容器（如果存在）
	if (containerRef) {
		containerRef().remove();
		persistentKeywordsContainers.delete(view);
		keywordRefs.delete(view);
	}
}

/**
 * 打字机效果：逐字显示文本
 * @param textRef 文本引用
 * @param text 要显示的完整文本
 * @param charsPerSecond 每秒显示的字符数，默认 15
 * @returns ThreadGenerator
 */
function* typewriterEffect(
	textRef: ReturnType<typeof createRef<Txt>>,
	text: string,
	charsPerSecond: number = 15
): ThreadGenerator {
	const delay = 1 / charsPerSecond; // 每个字符之间的延迟
	
	for (let i = 0; i <= text.length; i++) {
		textRef().text(text.substring(0, i));
		if (i < text.length) {
			yield* waitFor(delay);
		}
	}
}

/**
 * 显示单个节点及其箭头
 * @param nodeKey 节点key
 * @param refs 树节点引用
 * @param duration 动画时长
 * @param easing 缓动函数
 * @returns ThreadGenerator
 */
function* showSingleNode(
	nodeKey: string,
	refs: TreeNodeRefs,
	duration: number,
	easing: (t: number) => number
): ThreadGenerator {
	const childRef = refs.nodeRefs[nodeKey];
	const arrowRef = refs.arrowRefs[nodeKey];
	
	if (childRef) {
		const childNode = childRef();
		if (childNode) {
			const animations: ThreadGenerator[] = [
				childNode.opacity(1, duration, easing),
				childNode.scale(1, duration, easing),
			];
			
			if (arrowRef) {
				const arrow = arrowRef();
				if (arrow) {
					animations.push(
						arrow.opacity(1, duration, easing),
						arrow.end(1, duration, easing)
					);
				}
			}
			
			yield* all(...animations);
		}
	}
}

/**
 * 显示指定节点（通常用于显示根节点或单个节点）
 * @param refs 树节点引用
 * @param nodeKey 节点的key
 * @param options 配置选项
 * @returns ThreadGenerator 可以 yield* 来等待动画完成
 */
export function* showNode(
	refs: TreeNodeRefs,
	nodeKey: string,
	options: {
		duration?: number; // 动画时长，默认0.5秒
		easing?: (t: number) => number; // 缓动函数，默认easeOutCubic
	} = {}
): ThreadGenerator {
	const {
		duration = 0.5,
		easing = easeOutCubic,
	} = options;

	// 等待一帧，确保 refs 被正确赋值
	yield* waitFor(0);
	yield* showSingleNode(nodeKey, refs, duration, easing);
}

/**
 * 显示指定父节点的所有子节点
 * @param refs 树节点引用
 * @param parentKeyOrLabel 父节点的key或label
 * @param options 配置选项
 * @returns ThreadGenerator 可以 yield* 来等待动画完成
 */
export function* showNodeChildren(
	refs: TreeNodeRefs,
	parentKeyOrLabel: string,
	options: {
		duration?: number; // 动画时长，默认0.5秒
		easing?: (t: number) => number; // 缓动函数，默认easeOutCubic
	} = {}
): ThreadGenerator {
	const {
		duration = 0.5,
		easing = easeOutCubic,
	} = options;

	// 等待一帧，确保 refs 被正确赋值
	yield* waitFor(0);

	// 查找父节点
	const parentNode = refs.nodes.find(
		node => node.key === parentKeyOrLabel || node.label === parentKeyOrLabel
	);
	
	if (!parentNode || !parentNode.children) {
		return;
	}

	// 显示所有子节点
	for (const child of parentNode.children) {
		yield* showSingleNode(child.key, refs, duration, easing);
	}
}

/**
 * 隐藏节点（淡出动画）
 * @param refs 树节点引用
 * @param nodeKeyOrLabel 节点的key或label
 * @param options 配置选项
 * @returns ThreadGenerator
 */
export function* hideNode(
	refs: TreeNodeRefs,
	nodeKeyOrLabel: string,
	options: {
		duration?: number; // 动画时长，默认0.3秒
		easing?: (t: number) => number; // 缓动函数，默认easeOutCubic
	} = {}
): ThreadGenerator {
	const {
		duration = 0.3,
		easing = easeOutCubic,
	} = options;

	const node = refs.nodes.find(
		n => n.key === nodeKeyOrLabel || n.label === nodeKeyOrLabel
	);
	
	if (!node) return;
	
	const nodeRef = refs.nodeRefs[node.key];
	const arrowRef = refs.arrowRefs[node.key];
	
	if (!nodeRef || !nodeRef()) return;
	
	const animations: ThreadGenerator[] = [
		nodeRef().opacity(0, duration, easing),
		nodeRef().scale(0.8, duration, easing),
	];
	
	if (arrowRef && arrowRef()) {
		animations.push(
			arrowRef().opacity(0, duration, easing),
			arrowRef().end(0, duration, easing)
		);
	}
	
	yield* all(...animations);
}

/**
 * 添加节点并显示（简化版，自动查找新添加的节点）
 * @param refs 树节点引用
 * @param parentKeyOrLabel 父节点的key或label
 * @param childLabel 子节点的label
 * @param view 场景视图引用
 * @param options 配置选项
 * @returns ThreadGenerator
 */

/**
 * 移动节点（从旧父节点移到新父节点，带动画）
 * @param refs 树节点引用
 * @param nodeLabel 要移动的节点的label
 * @param oldParentKeyOrLabel 旧父节点的key或label
 * @param newParentKeyOrLabel 新父节点的key或label
 * @param view 场景视图引用
 * @param options 配置选项
 * @returns ThreadGenerator
 */
export function* moveNode(
	refs: TreeNodeRefs,
	nodeLabel: string,
	oldParentKeyOrLabel: string,
	newParentKeyOrLabel: string,
	view: Layout,
	options: {
		theme?: TreeNodeTheme;
		childSpacing?: number;
		childVerticalOffset?: number;
		showArrows?: boolean;
		zIndex?: number;
		hideDuration?: number;
		showDuration?: number;
		easing?: (t: number) => number;
	} = {}
): ThreadGenerator {
	const {
		theme = { fontSize: 24 },
		childSpacing = 150,
		childVerticalOffset = 200,
		showArrows = true,
		zIndex = 100,
		hideDuration = 0.3,
		showDuration = 0.5,
		easing = easeOutCubic,
	} = options;

	// 找到旧位置的节点
	const oldNode = refs.nodes.find(
		node => (node.parent?.key === oldParentKeyOrLabel || node.parent?.label === oldParentKeyOrLabel)
			&& node.label === nodeLabel
	);

	if (!oldNode) {
		console.warn(`节点 "${nodeLabel}" 在 "${oldParentKeyOrLabel}" 下未找到`);
		return;
	}

	// 淡出旧位置的节点
	yield* hideNode(refs, oldNode.key, { duration: hideDuration, easing });

	// 删除旧节点
	removeNode(refs, oldNode.key);

	// 等待一帧确保删除完成
	yield* waitFor(0);

	// 在新位置添加节点
	addNodeTo({
		refs,
		nodeName: newParentKeyOrLabel,
		childNode: { label: nodeLabel },
		view,
		theme,
		childSpacing,
		childVerticalOffset,
		showArrows,
		zIndex,
	});

	// 等待一帧确保添加完成
	yield* waitFor(0);

	// 找到并显示新添加的节点
	const newNode = refs.nodes.find(
		node => (node.parent?.key === newParentKeyOrLabel || node.parent?.label === newParentKeyOrLabel) 
			&& node.label === nodeLabel
	);
	
	if (newNode) {
		yield* showNode(refs, newNode.key, { duration: showDuration, easing });
	}
}

/**
 * 隐藏并删除节点的所有子节点（带动画）
 * @param refs 树节点引用
 * @param parentKeyOrLabel 父节点的key或label
 * @param options 配置选项
 * @returns ThreadGenerator
 */
export function* hideAndRemoveNodeChildren(
	refs: TreeNodeRefs,
	parentKeyOrLabel: string,
	options: {
		duration?: number; // 动画时长，默认0.3秒
		easing?: (t: number) => number; // 缓动函数，默认easeOutCubic
	} = {}
): ThreadGenerator {
	const {
		duration = 0.3,
		easing = easeOutCubic,
	} = options;

	// 查找父节点
	const parentNode = refs.nodes.find(
		node => node.key === parentKeyOrLabel || node.label === parentKeyOrLabel
	);
	
	if (!parentNode || !parentNode.children) {
		return;
	}

	// 同时淡出所有子节点（并行执行）
	const animations: ThreadGenerator[] = [];
	for (const child of parentNode.children) {
		animations.push(hideNode(refs, child.key, { duration, easing }));
	}
	
	// 并行执行所有淡出动画
	if (animations.length > 0) {
		yield* all(...animations);
	}
	
	// 等待动画完成后删除所有子节点
	yield* waitFor(0);
	removeNodeChildren(refs, parentKeyOrLabel);
}

/**
 * 按层级显示树节点（节点和箭头）
 * @param refs 树节点引用
 * @param rootData 树根数据（用于计算子节点）
 * @param options 配置选项
 * @returns ThreadGenerator 可以 yield* 来等待动画完成
 */
export function* showTreeNodesByLevel(
	refs: TreeNodeRefs,
	rootData: { children?: Record<string, any> },
	options: {
		startLevel?: number; // 从哪一层开始显示（1=第二层，2=第三层，以此类推），默认1
		endLevel?: number; // 显示到哪一层（默认显示所有层）
		duration?: number; // 动画时长，默认0.5秒
		easing?: (t: number) => number; // 缓动函数，默认easeOutCubic
	} = {}
): ThreadGenerator {
	const {
		startLevel = 1,
		endLevel = Infinity,
		duration = 0.5,
		easing = easeOutCubic,
	} = options;

	// 等待一帧，确保 refs 被正确赋值
	yield* waitFor(0);

	// 获取根节点的子节点（第二层）
	const rootChildren = rootData.children || {};
	const childrenKeys = Object.keys(rootChildren);

	if (startLevel === 1) {
		// 显示第二层节点
		for (let i = 0; i < childrenKeys.length; i++) {
			const key = childrenKeys[i];
			yield* showSingleNode(key, refs, duration, easing);
		}
	}

	if (endLevel >= 2) {
		// 显示第三层及以下节点
		for (let i = 0; i < childrenKeys.length; i++) {
			const parentKey = childrenKeys[i];
			const parentNode = refs.nodes.find(n => n.key === parentKey);
			if (parentNode && parentNode.children) {
				for (const grandChild of parentNode.children) {
					yield* showSingleNode(grandChild.key, refs, duration, easing);
				}
			}
		}
	}
}

/**
 * 显示圆形排列的图片动画
 * @param imageRefs 图片引用数组
 * @param positions 圆形位置数组（由 createCircleImages 返回）
 * @param view 场景视图引用
 * @param options 配置选项
 * @param options.duration 动画持续时间（秒），默认 0.8
 * @param options.finalScale 最终缩放比例，默认 0.1
 * @param options.sequential 是否逐个显示（true）或同时显示（false），默认 true
 * @param options.delayBetween 逐个显示时，每个图片之间的延迟（秒），默认 0.05
 * @returns ThreadGenerator 可以 yield* 来等待动画完成
 */
export function* showCircleImages(
	imageRefs: ReturnType<typeof createRef<Img>>[],
	positions: [number, number][],
	view: Layout,
	options: {
		duration?: number;
		finalScale?: number;
		sequential?: boolean;
		delayBetween?: number;
	} = {}
): ThreadGenerator {
	const {
		duration = 0.8,
		finalScale = 0.1,
		sequential = true,
		delayBetween = 0.05,
	} = options;

	if (sequential) {
		// 逐个显示图片，围成圆圈
		for (let index = 0; index < imageRefs.length; index++) {
			const imgRef = imageRefs[index];
			const [finalX, finalY] = positions[index];
			
			// 从屏幕外不同位置飞入（根据索引计算起始位置，保持稳定）
			const startXOffset = (index % 10 - 5) * 300; // 从不同水平位置开始
			const startY = view.height() / 2 + 200; // 从屏幕下方开始
			
			// 设置初始状态
			imgRef().position([startXOffset, startY]);
			imgRef().scale(0); // 初始缩放为0
			imgRef().opacity(0); // 初始透明度为0
		
			// 显示并移动到圆形位置
			yield* all(
				imgRef().position([finalX, finalY], duration, easeOutCubic),
				imgRef().opacity(1, duration, easeOutCubic),
				imgRef().scale(finalScale, duration, easeOutCubic)
			);
			
			// 如果不是最后一个，等待一小段时间再显示下一个
			if (index < imageRefs.length - 1) {
				yield* waitFor(delayBetween);
			}
		}
	} else {
		// 同时显示所有图片，从不同位置淡入并移动到圆形位置
		yield* all(
			...imageRefs.map((imgRef, index) => {
				const [finalX, finalY] = positions[index];
				
				// 从屏幕外不同位置飞入（根据索引计算起始位置，保持稳定）
				const startXOffset = (index % 10 - 5) * 300; // 从不同水平位置开始
				const startY = view.height() / 2 + 200; // 从屏幕下方开始
				
				// 设置初始状态
				imgRef().position([startXOffset, startY]);
				imgRef().scale(0); // 初始缩放为0
			
				return all(
					imgRef().position([finalX, finalY], duration, easeOutCubic),
					imgRef().opacity(1, duration, easeOutCubic),
					imgRef().scale(finalScale, duration, easeOutCubic)
				);
			})
		);
	}
}

/**
 * 让圆形排列的图片掉落并消失
 * @param imageRefs 图片引用数组
 * @param view 场景视图引用
 * @param options 配置选项
 * @param options.duration 基础动画持续时间（秒），默认 1.0，每个图片会有随机变化
 * @param options.fallDistance 掉落距离（像素），默认屏幕高度的1.5倍
 * @param options.rotation 旋转角度（度），默认随机旋转
 * @param options.maxDelay 最大延迟时间（秒），默认 0.5，每个图片会有随机延迟
 * @param options.durationVariation 时长变化范围（秒），默认 0.4，会在基础时长上加减这个值
 * @returns ThreadGenerator 可以 yield* 来等待动画完成
 */
export function* fallAndDisappearCircleImages(
	imageRefs: ReturnType<typeof createRef<Img>>[],
	view: Layout,
	options: {
		duration?: number;
		fallDistance?: number;
		rotation?: number | ((index: number) => number);
		maxDelay?: number;
		durationVariation?: number;
	} = {}
): ThreadGenerator {
	const {
		duration = 1.0,
		fallDistance,
		rotation,
		maxDelay = 0.5,
		durationVariation = 0.4,
	} = options;

	const calculatedFallDistance = fallDistance ?? view.height() * 1.5;

	// 为每个图片生成随机参数（使用固定种子确保可重复）
	const randomParams = imageRefs.map((_, index) => {
		// 使用索引作为种子的一部分，确保每次运行结果一致
		const seed = index * 0.1;
		const delay = (Math.sin(seed) * 0.5 + 0.5) * maxDelay; // 0 到 maxDelay
		const durationVariationValue = (Math.cos(seed * 2) * 0.5 + 0.5) * durationVariation * 2 - durationVariation; // -durationVariation 到 +durationVariation
		const individualDuration = duration + durationVariationValue;
		return { delay, duration: individualDuration };
	});

	// 使用 spawn 让每个图片独立执行，有不同的延迟和速度
	for (let i = 0; i < imageRefs.length; i++) {
		const imgRef = imageRefs[i];
		const { delay, duration: individualDuration } = randomParams[i];
		
		spawn(function* () {
			// 等待随机延迟
			if (delay > 0) {
				yield* waitFor(delay);
			}
			
			const currentPos = imgRef().position();
			const finalY = currentPos.y + calculatedFallDistance;
			
			// 计算旋转角度
			let finalRotation = 0;
			if (typeof rotation === 'function') {
				finalRotation = rotation(i);
			} else if (typeof rotation === 'number') {
				finalRotation = rotation;
			} else {
				// 使用索引生成"随机"但可重复的旋转角度
				const rotationSeed = i * 0.3;
				finalRotation = (Math.sin(rotationSeed) * 0.5 + 0.5) * 360 - 180; // -180 到 180 度
			}
			
			yield* all(
				imgRef().position([currentPos.x, finalY], individualDuration, easeOutCubic),
				imgRef().opacity(0, individualDuration, easeOutCubic),
				imgRef().rotation(finalRotation, individualDuration, easeOutCubic),
				imgRef().scale(0, individualDuration * 0.8, easeOutCubic) // 稍微提前缩小
			);
		});
	}

	// 等待所有动画完成（最长延迟 + 最长动画时长）
	const maxDelayValue = Math.max(...randomParams.map(p => p.delay));
	const maxDurationValue = Math.max(...randomParams.map(p => p.duration));
	yield* waitFor(maxDelayValue + maxDurationValue);
}

