// ==UserScript==
// @name         Discord翻译助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  使用Google Gemini Flash 2翻译Discord消息
// @author       You
// @match        https://discord.com/*
// @match        https://canary.discord.com/*
// @match        https://ptb.discord.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 配置变量
    let API_KEY = GM_getValue('gemini_api_key', '');
    let TARGET_LANGUAGE = GM_getValue('target_language', 'zh-CN'); // 默认翻译成中文
    
    // API端点
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

    // 创建设置面板
    function createSettingsPanel() {
        const panel = document.createElement('div');
        panel.id = 'discord-translator-settings';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #2f3136;
            border: 1px solid #40444b;
            border-radius: 8px;
            padding: 20px;
            z-index: 10000;
            color: #dcddde;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            width: 400px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.24);
            display: none;
        `;
        
        panel.innerHTML = `
            <h3 style="margin-top: 0; color: #ffffff;">Discord翻译设置</h3>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Gemini API Key:</label>
                <input type="text" id="api-key-input" placeholder="输入你的Gemini API Key" 
                       style="width: 100%; padding: 8px; background: #40444b; border: 1px solid #40444b; 
                              border-radius: 4px; color: #dcddde; box-sizing: border-box;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">目标语言:</label>
                <select id="language-select" style="width: 100%; padding: 8px; background: #40444b; 
                                                   border: 1px solid #40444b; border-radius: 4px; 
                                                   color: #dcddde;">
                    <option value="zh-CN">中文(简体)</option>
                    <option value="zh-TW">中文(繁体)</option>
                    <option value="en">English</option>
                    <option value="ja">日本語</option>
                    <option value="ko">한국어</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="es">Español</option>
                </select>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button id="save-settings" style="padding: 8px 16px; background: #5865f2; 
                                                  border: none; border-radius: 4px; color: white; 
                                                  cursor: pointer;">保存</button>
                <button id="close-settings" style="padding: 8px 16px; background: #4f545c; 
                                                   border: none; border-radius: 4px; color: white; 
                                                   cursor: pointer;">关闭</button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // 设置当前值
        document.getElementById('api-key-input').value = API_KEY;
        document.getElementById('language-select').value = TARGET_LANGUAGE;
        
        // 绑定事件
        document.getElementById('save-settings').onclick = saveSettings;
        document.getElementById('close-settings').onclick = () => panel.style.display = 'none';
        
        return panel;
    }

    // 保存设置
    function saveSettings() {
        API_KEY = document.getElementById('api-key-input').value;
        TARGET_LANGUAGE = document.getElementById('language-select').value;
        
        GM_setValue('gemini_api_key', API_KEY);
        GM_setValue('target_language', TARGET_LANGUAGE);
        
        document.getElementById('discord-translator-settings').style.display = 'none';
        
        // 显示保存成功提示
        showNotification('设置已保存！');
    }

    // 显示通知
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #43b581;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10001;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // 调用Gemini API进行翻译（增强多行支持）
    async function translateText(text) {
        if (!API_KEY) {
            showNotification('请先设置API Key！');
            return null;
        }

        // 预处理文本，保持格式
        const processedText = text.trim();
        if (!processedText) {
            throw new Error('文本内容为空');
        }

        const requestBody = {
            contents: [{
                parts: [{
                    text: `请将以下文本翻译成${getLanguageName(TARGET_LANGUAGE)}。保持原文的换行和段落格式，只返回翻译结果，不要添加任何解释、引号或格式标记：

${processedText}`
                }]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 2048,
            }
        };

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${GEMINI_API_URL}?key=${API_KEY}`,
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify(requestBody),
                timeout: 30000, // 30秒超时
                onload: function(response) {
                    try {
                        if (response.status !== 200) {
                            reject(`API请求失败 (${response.status}): ${response.statusText}`);
                            return;
                        }

                        const data = JSON.parse(response.responseText);
                        
                        if (data.error) {
                            reject(`API错误: ${data.error.message || '未知错误'}`);
                            return;
                        }
                        
                        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                            const translatedText = data.candidates[0].content.parts[0].text.trim();
                            if (translatedText) {
                                resolve(translatedText);
                            } else {
                                reject('翻译结果为空');
                            }
                        } else {
                            reject('API返回格式异常');
                        }
                    } catch (error) {
                        reject('响应解析失败: ' + error.message);
                    }
                },
                onerror: function(error) {
                    reject('网络连接失败');
                },
                ontimeout: function() {
                    reject('请求超时，请重试');
                }
            });
        });
    }

    // 获取语言名称
    function getLanguageName(code) {
        const languages = {
            'zh-CN': '简体中文',
            'zh-TW': '繁体中文',
            'en': '英语',
            'ja': '日语',
            'ko': '韩语',
            'fr': '法语',
            'de': '德语',
            'es': '西班牙语'
        };
        return languages[code] || '中文';
    }

    // 创建翻译按钮
    function createTranslateButton(messageElement) {
        const button = document.createElement('button');
        button.innerHTML = '翻译';
        button.className = 'discord-translate-btn';
        button.style.cssText = `
            background: #5865f2;
            border: none;
            color: white;
            padding: 2px 8px;
            margin-left: 8px;
            border-radius: 3px;
            font-size: 12px;
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.2s;
        `;
        
        button.onmouseover = () => button.style.opacity = '1';
        button.onmouseout = () => button.style.opacity = '0.7';
        
        button.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const textContent = getMessageText(messageElement);
            if (!textContent.trim()) return;
            
            // 检查是否是重试操作
            const isRetry = button.innerHTML === '重试' || button.innerHTML === '已翻译';
            
            button.innerHTML = '翻译中...';
            button.disabled = true;
            
            try {
                const translation = await translateText(textContent);
                if (translation) {
                    showTranslation(messageElement, translation, isRetry);
                    button.innerHTML = '已翻译';
                    button.style.background = '#43b581';
                    
                    // 3秒后将按钮变为重试状态
                    setTimeout(() => {
                        button.innerHTML = '重试';
                        button.style.background = '#faa61a';
                        button.disabled = false;
                    }, 3000);
                }
            } catch (error) {
                console.error('翻译错误：', error);
                showNotification('翻译失败：' + error);
                button.innerHTML = '重试';
                button.style.background = '#ed4245';
                button.disabled = false;
                
                // 显示错误翻译结果（便于重试）
                const errorDiv = document.createElement('div');
                errorDiv.className = 'discord-translation';
                errorDiv.style.cssText = `
                    background: #2f3136;
                    border-left: 3px solid #ed4245;
                    margin-top: 8px;
                    padding: 8px 12px;
                    border-radius: 4px;
                    color: #ed4245;
                    font-size: 14px;
                    line-height: 1.4;
                `;
                errorDiv.innerHTML = `
                    <div style="font-size: 12px; margin-bottom: 4px;">翻译失败：</div>
                    <div>${error}</div>
                    <div style="font-size: 12px; margin-top: 4px; color: #72767d;">点击"重试"按钮重新翻译</div>
                `;
                
                // 移除已存在的翻译
                const existingTranslation = messageElement.querySelector('.discord-translation');
                if (existingTranslation) {
                    existingTranslation.remove();
                }
                
                // 插入错误信息
                const messageContent = messageElement.querySelector('[class*="messageContent"]');
                if (messageContent) {
                    messageContent.parentNode.insertBefore(errorDiv, messageContent.nextSibling);
                } else {
                    messageElement.appendChild(errorDiv);
                }
            }
        };
        
        return button;
    }

    // 获取消息文本内容（支持多行）
    function getMessageText(messageElement) {
        console.log('正在提取消息文本...', messageElement);
        
        // 更全面的Discord消息内容选择器
        const contentSelectors = [
            // 新版Discord选择器
            '[class*="messageContent-"]',
            '[class*="messageContent_"]', 
            '[class*="markup-"]',
            '[class*="markup_"]',
            '[data-slate-editor="true"]',
            // 旧版Discord选择器
            '.messageContent',
            '.markup',
            // 通用选择器
            '[class*="content"]',
            '[class*="text"]'
        ];
        
        let contentElement = null;
        
        // 尝试所有选择器
        for (const selector of contentSelectors) {
            contentElement = messageElement.querySelector(selector);
            if (contentElement) {
                console.log('找到内容元素:', selector, contentElement);
                break;
            }
        }
        
        // 如果没找到，尝试查找所有可能的文本容器
        if (!contentElement) {
            const allDivs = messageElement.querySelectorAll('div');
            for (const div of allDivs) {
                // 检查div是否包含实际文本内容（排除只有空白的div）
                if (div.textContent && div.textContent.trim().length > 0) {
                    // 排除一些明显不是消息内容的元素
                    const className = div.className || '';
                    if (!className.includes('timestamp') && 
                        !className.includes('username') && 
                        !className.includes('avatar') &&
                        !className.includes('header') &&
                        !className.includes('button')) {
                        contentElement = div;
                        console.log('通过div查找找到内容:', div);
                        break;
                    }
                }
            }
        }
        
        if (!contentElement) {
            console.log('未找到消息内容元素');
            return '';
        }
        
        // 深度提取文本内容，保留格式
        function extractText(node) {
            if (!node) return '';
            
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent || '';
            } 
            
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                
                // 跳过一些不需要的元素
                if (['script', 'style', 'noscript'].includes(tagName)) {
                    return '';
                }
                
                // 处理换行标签
                if (tagName === 'br') {
                    return '\n';
                }
                
                // 处理块级元素
                if (['div', 'p', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                    let content = '';
                    for (const child of node.childNodes) {
                        content += extractText(child);
                    }
                    // 只在内容不为空时添加换行
                    return content.trim() ? content + '\n' : content;
                }
                
                // 处理列表项
                if (tagName === 'li') {
                    let content = '';
                    for (const child of node.childNodes) {
                        content += extractText(child);
                    }
                    return '• ' + content.trim() + '\n';
                }
                
                // 处理代码块
                if (tagName === 'code') {
                    let content = '';
                    for (const child of node.childNodes) {
                        content += extractText(child);
                    }
                    return content;
                }
                
                // 其他内联元素
                let content = '';
                for (const child of node.childNodes) {
                    content += extractText(child);
                }
                return content;
            }
            
            return '';
        }
        
        let text = extractText(contentElement);
        
        // 清理文本
        text = text
            .replace(/\n{3,}/g, '\n\n')  // 清理多余换行
            .replace(/[ \t]+/g, ' ')     // 清理多余空格
            .trim();
        
        console.log('提取的文本内容:', text);
        return text;
    }

    // 显示翻译结果（支持重试）
    function showTranslation(messageElement, translation, isRetry = false) {
        // 移除已存在的翻译
        const existingTranslation = messageElement.querySelector('.discord-translation');
        if (existingTranslation) {
            existingTranslation.remove();
        }
        
        const translationDiv = document.createElement('div');
        translationDiv.className = 'discord-translation';
        translationDiv.style.cssText = `
            background: #2f3136;
            border-left: 3px solid #5865f2;
            margin-top: 8px;
            padding: 8px 12px;
            border-radius: 4px;
            font-style: italic;
            color: #b9bbbe;
            font-size: 14px;
            line-height: 1.4;
            position: relative;
        `;
        
        // 创建重试按钮
        const retryButton = document.createElement('button');
        retryButton.innerHTML = '🔄';
        retryButton.title = '重新翻译';
        retryButton.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            background: transparent;
            border: none;
            color: #72767d;
            cursor: pointer;
            font-size: 12px;
            padding: 2px;
            border-radius: 2px;
            transition: color 0.2s, background-color 0.2s;
        `;
        
        retryButton.onmouseover = () => {
            retryButton.style.color = '#dcddde';
            retryButton.style.backgroundColor = '#40444b';
        };
        retryButton.onmouseout = () => {
            retryButton.style.color = '#72767d';
            retryButton.style.backgroundColor = 'transparent';
        };
        
        // 重试按钮点击事件
        retryButton.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const translateBtn = messageElement.querySelector('.discord-translate-btn');
            if (translateBtn) {
                // 触发重新翻译
                translateBtn.click();
            }
        };
        
        translationDiv.innerHTML = `
            <div style="font-size: 12px; color: #72767d; margin-bottom: 4px; padding-right: 20px;">
                翻译${isRetry ? ' (重试)' : ''}：
            </div>
            <div style="white-space: pre-wrap;">${translation.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        `;
        
        translationDiv.appendChild(retryButton);
        
        // 找到合适的位置插入翻译
        const messageContent = messageElement.querySelector('[class*="messageContent"]');
        if (messageContent) {
            messageContent.parentNode.insertBefore(translationDiv, messageContent.nextSibling);
        } else {
            messageElement.appendChild(translationDiv);
        }
    }

    // 监听消息变化并添加翻译按钮
    function addTranslateButtons() {
        // 更全面的Discord消息选择器
        const messageSelectors = [
            // 新版Discord消息选择器
            '[class*="message-"][class*="cozy-"]',
            '[class*="message_"][class*="cozy_"]',
            '[class*="messageListItem-"]',
            '[class*="messageListItem_"]',
            '[id^="chat-messages-"]',
            '[id^="message-"]',
            // 通用消息选择器
            '[class*="message"]',
            'li[class*="message"]',
            'div[class*="message"]'
        ];
        
        const processedMessages = new Set();
        
        for (const selector of messageSelectors) {
            const messages = document.querySelectorAll(selector);
            console.log(`找到 ${messages.length} 条消息 (选择器: ${selector})`);
            
            messages.forEach(messageElement => {
                // 避免重复处理同一消息
                if (processedMessages.has(messageElement)) return;
                processedMessages.add(messageElement);
                
                // 检查是否已经添加了按钮
                if (messageElement.querySelector('.discord-translate-btn')) return;
                
                // 检查是否有消息内容
                const textContent = getMessageText(messageElement);
                if (!textContent.trim() || textContent.length < 2) {
                    console.log('消息内容为空或太短，跳过:', textContent);
                    return;
                }
                
                console.log('为消息添加翻译按钮:', textContent.substring(0, 50) + '...');
                
                // 尝试多个位置添加按钮
                const headerSelectors = [
                    '[class*="messageHeader-"]',
                    '[class*="messageHeader_"]',
                    '[class*="header-"]',
                    '[class*="header_"]',
                    '[class*="username"]',
                    '[class*="timestamp"]'
                ];
                
                let buttonAdded = false;
                
                for (const headerSelector of headerSelectors) {
                    const headerElement = messageElement.querySelector(headerSelector);
                    if (headerElement && !buttonAdded) {
                        const button = createTranslateButton(messageElement);
                        
                        // 创建按钮容器
                        const buttonContainer = document.createElement('span');
                        buttonContainer.style.cssText = 'margin-left: 8px; display: inline-block;';
                        buttonContainer.appendChild(button);
                        
                        // 尝试添加到header的父元素或者header本身
                        try {
                            if (headerElement.parentElement) {
                                headerElement.parentElement.appendChild(buttonContainer);
                            } else {
                                headerElement.appendChild(buttonContainer);
                            }
                            buttonAdded = true;
                            console.log('按钮已添加到:', headerSelector);
                            break;
                        } catch (e) {
                            console.log('添加按钮失败:', e);
                        }
                    }
                }
                
                // 如果header位置添加失败，尝试添加到消息内容附近
                if (!buttonAdded) {
                    const contentElement = messageElement.querySelector('[class*="messageContent"], [class*="markup"], div');
                    if (contentElement) {
                        const button = createTranslateButton(messageElement);
                        button.style.cssText += 'margin: 4px 0; display: block;';
                        
                        try {
                            // 添加到内容元素后面
                            if (contentElement.parentElement) {
                                contentElement.parentElement.insertBefore(button, contentElement.nextSibling);
                            } else {
                                messageElement.appendChild(button);
                            }
                            buttonAdded = true;
                            console.log('按钮已添加到消息内容附近');
                        } catch (e) {
                            console.log('添加按钮到内容附近失败:', e);
                        }
                    }
                }
                
                if (!buttonAdded) {
                    console.log('无法为消息添加翻译按钮');
                }
            });
        }
    }

    // 创建设置按钮
    function createSettingsButton() {
        const button = document.createElement('div');
        button.innerHTML = '🌐';
        button.title = 'Discord翻译设置';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: #5865f2;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 9999;
            font-size: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: transform 0.2s;
        `;
        
        button.onmouseover = () => button.style.transform = 'scale(1.1)';
        button.onmouseout = () => button.style.transform = 'scale(1)';
        
        button.onclick = () => {
            const panel = document.getElementById('discord-translator-settings') || createSettingsPanel();
            panel.style.display = 'block';
        };
        
        document.body.appendChild(button);
    }

    // 初始化
    function init() {
        // 等待页面加载完成
        const checkReady = setInterval(() => {
            if (window.location.href.includes('discord.com') && document.querySelector('[class*="app-"]')) {
                clearInterval(checkReady);
                
                console.log('Discord翻译助手开始初始化...');
                
                // 创建设置按钮
                createSettingsButton();
                
                // 初始添加翻译按钮
                setTimeout(() => {
                    console.log('开始添加翻译按钮...');
                    addTranslateButtons();
                }, 3000); // 增加等待时间确保页面完全加载
                
                // 监听DOM变化，为新消息添加翻译按钮
                const observer = new MutationObserver((mutations) => {
                    let shouldCheck = false;
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            // 检查是否有新的消息节点
                            for (const node of mutation.addedNodes) {
                                if (node.nodeType === Node.ELEMENT_NODE) {
                                    // 检查节点本身或其子节点是否包含消息
                                    if (node.querySelector && (
                                        node.matches('[class*="message"]') ||
                                        node.querySelector('[class*="message"]') ||
                                        node.matches('[id^="message-"]') ||
                                        node.querySelector('[id^="message-"]')
                                    )) {
                                        shouldCheck = true;
                                        break;
                                    }
                                }
                            }
                        }
                    });
                    
                    if (shouldCheck) {
                        console.log('检测到新消息，添加翻译按钮...');
                        setTimeout(addTranslateButtons, 500);
                    }
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
                
                // 定期检查并添加翻译按钮（备用机制）
                setInterval(() => {
                    addTranslateButtons();
                }, 10000); // 每10秒检查一次
                
                console.log('Discord翻译助手已加载');
            }
        }, 1000);
    }

    // 启动插件
    init();
})();
