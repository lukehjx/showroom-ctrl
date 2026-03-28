import logging
from openai import AsyncOpenAI
from config import get_config

logger = logging.getLogger(__name__)

QWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'

INTENT_KEYWORDS = {
    'list_files': ['有哪些文件', '有什么文件', '有哪些内容', '有什么内容', '有什么资料', '给我看看', '这里有什么', '展示什么', '能看什么', '文件列表', '有哪些'],
    'next_exhibit': ['下一个', '继续参观', '往前走', '去下一个', '下个展项', '下一展项'],
    'prev_exhibit': ['上一个', '回上一个', '去上一个', '上个展项', '上一展项'],
    'start_tour': ['开始参观', '陪我参观', '带我参观', '参观展厅', '带我逛', '开始游览', '出发'],
    'go_home': ['回到入口', '回原位', '回起点', '回到起点'],
    'go_charge': ['去充电', '回去充电', '充电'],
    'repeat': ['再说一遍', '重复一下', '再讲一遍', '没听清', '再说一次'],
    'stop': ['停', '停止', '好了', '不用了', '知道了', '够了', '结束'],
    'continue': ['继续', '接着说', '继续讲', '继续说'],
    'select': ['第一个', '第二个', '第三个', '第四个', '第五个', '第六个', '第七个', '第八个', '第九个', '第十个', '最后一个'],
    # 设备控制（组策略）
    'device_control': ['灯全开', '灯全关', '开灯', '关灯', '开广告机', '关广告机', '全部开机', '全部关机', '每日全开', '每日全关', '开所有灯', '关所有灯', '开电', '断电'],
    # 切换专场（关键词匹配后需进一步提取专场名，由 LLM 或精确匹配处理）
    'switch_scene': ['切换专场', '换专场', '切换到', '切换成', '启用专场', '换成', '切到'],
    # 接管控制
    'takeover': ['我来控制', '接管', '切换到我', '我接管', '手动控制', 'bot接管', '机器人接管'],
    'narrate': ['讲解一下', '讲解', '介绍一下', '介绍', '讲讲', '说说', '讲一下', '播报讲解', '讲解词', '念一下', '念出来'],
}

# 设备控制关键词到命令名称的映射
DEVICE_CMD_MAP = {
    '灯全开': '灯全开', '开灯': '灯全开', '开所有灯': '灯全开',
    '灯全关': '灯全关', '关灯': '灯全关', '关所有灯': '灯全关',
    '开广告机': '开广告机',
    '关广告机': '关广告机',
    '每日全开': '每日全开', '全部开机': '每日全开', '开电': '每日全开',
    '每日全关': '每日全关', '全部关机': '每日全关', '断电': '每日全关',
}

SELECT_INDEX_MAP = {
    '第一个': 1, '第二个': 2, '第三个': 3, '第四个': 4, '第五个': 5,
    '第六个': 6, '第七个': 7, '第八个': 8, '第九个': 9, '第十个': 10, '最后一个': -1
}


NARRATE_TRIGGERS = ['讲解一下', '讲解', '介绍一下', '介绍', '讲讲', '说说', '讲一下', '播报讲解', '讲解词', '念一下', '念出来']

def keyword_match(text: str) -> tuple[str, dict]:
    """关键词匹配意图"""
    # 优先检测讲解意图（避免被 select 抢先）
    for nkw in NARRATE_TRIGGERS:
        if nkw in text:
            idx = None
            for k, v in SELECT_INDEX_MAP.items():
                if k in text:
                    idx = v
                    break
            return 'narrate', {'index': idx}
    for intent, keywords in INTENT_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                extra = {}
                if intent == 'select':
                    idx = SELECT_INDEX_MAP.get(kw, 1)
                    extra = {"index": idx}
                elif intent == 'device_control':
                    cmd_name = DEVICE_CMD_MAP.get(kw, kw)
                    extra = {"cmd_name": cmd_name, "keyword": kw}
                elif intent == 'switch_scene':
                    # 提取专场名：去掉触发词后剩余的文字
                    scene_name = text.replace(kw, '').strip().rstrip('专场场').strip()
                    if not scene_name:
                        scene_name = text
                    extra = {"scene_name": scene_name, "raw_text": text}
                elif intent == 'narrate':
                    idx = None
                    for k, v in SELECT_INDEX_MAP.items():
                        if k in text:
                            idx = v
                            break
                    extra = {'index': idx}
                elif intent == 'takeover':
                    # 判断接管方向
                    if any(x in text for x in ['bot接管', '我来控制', '手动控制', '切换到我', '我接管']):
                        extra = {"operator": "bot"}
                    elif '机器人接管' in text:
                        extra = {"operator": "robot"}
                    else:
                        extra = {"operator": "bot"}
                return intent, extra
    return None, {}


async def recognize_intent(text: str, context: dict = None) -> dict:
    """意图识别：先关键词，后AI"""
    # 1. 关键词快速匹配
    intent, extra = keyword_match(text)
    if intent:
        logger.info(f"Keyword matched intent: {intent} for '{text}'")
        return {"intent": intent, "text": text, "extra": extra, "method": "keyword"}

    # 2. AI意图识别
    try:
        qwen_key = await get_config("ai.qwen_key") or "sk-845c78e1c9a749ba901c5ce3d68f4a33"
        qwen_model = await get_config("ai.qwen_model") or "qwen-plus-latest"

        client = AsyncOpenAI(api_key=qwen_key, base_url=QWEN_BASE_URL)

        system_prompt = """你是展厅导览机器人的意图识别模块。
根据用户输入，识别以下意图之一：
- list_files: 查看文件/内容/资料
- next_exhibit: 去下一个展项
- prev_exhibit: 去上一个展项
- start_tour: 开始参观
- go_home: 回到入口/原位
- go_charge: 去充电
- repeat: 重复讲解
- stop: 停止/结束
- continue: 继续讲解
- select: 选择某个选项（返回index字段）
- device_control: 设备控制（开关灯、开关广告机、开关电源等，返回cmd_name字段）
- query_exhibit: 询问某个展项（返回exhibit_name字段）
- unknown: 无法识别

只返回JSON格式：{"intent": "xxx", "extra": {}}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ]

        response = await client.chat.completions.create(
            model=qwen_model,
            messages=messages,
            temperature=0.1,
            max_tokens=200
        )

        result_text = response.choices[0].message.content.strip()
        # 解析JSON
        import json
        try:
            result = json.loads(result_text)
            result["text"] = text
            result["method"] = "ai"
            logger.info(f"AI matched intent: {result.get('intent')} for '{text}'")
            return result
        except json.JSONDecodeError:
            logger.warning(f"AI returned non-JSON: {result_text}")
            return {"intent": "unknown", "text": text, "extra": {}, "method": "ai"}

    except Exception as e:
        logger.error(f"AI intent recognition failed: {e}")
        return {"intent": "unknown", "text": text, "extra": {}, "method": "error", "error": str(e)}


async def llm_chat(text: str, context: dict = None) -> str:
    """大模型兜底闲聊回复（识别不到意图时使用）"""
    try:
        qwen_key = await get_config("ai.qwen_key") or "sk-845c78e1c9a749ba901c5ce3d68f4a33"
        qwen_model = await get_config("ai.qwen_model") or "qwen-plus-latest"
        # 从后台读取可配置的系统提示词
        bot_name = await get_config("bot.name") or "旺财"
        bot_location = await get_config("bot.location") or "南京"
        system_prompt_tpl = await get_config("bot.system_prompt") or (
            "你是展厅导览机器人{name}，当前位于{location}。"
            "你服务于思德科技展厅，可以介绍展项、引导参观、回答展厅相关问题，也可以友好闲聊。"
            "你可以联网查询最新资讯（天气、新闻等）。"
            "请用简短活泼的语气回复（不超过150字）。"
            "展厅指令：有哪些文件/开始参观/灯全开/灯全关/去下一个展项。"
        )
        system_prompt = system_prompt_tpl.format(name=bot_name, location=bot_location)

        client = AsyncOpenAI(api_key=qwen_key, base_url=QWEN_BASE_URL)
        response = await client.chat.completions.create(
            model=qwen_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text},
            ],
            temperature=0.7,
            max_tokens=300,
            extra_body={"enable_search": True},  # 千问联网搜索
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"llm_chat error: {e}")
        return f"抱歉，我暂时没理解。可以说「开始参观」或「有哪些文件」来使用展厅功能～"
