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

    // 调用Gemini API进行翻译
    async function translateText(text) {
        if (!API_KEY) {
            showNotification('请先设置API Key！');
            return null;
        }

        const requestBody = {
            contents: [{
                parts: [{
                    text: `请将以下文本翻译成${getLanguageName(TARGET_LANGUAGE)}，只返回翻译结果，不要添加任何解释或格式：\n\n${text}`
                }]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1024,
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
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                            const translatedText = data.candidates[0].content.parts[0].text.trim();
                            resolve(translatedText);
                        } else {
                            reject('翻译失败：无效响应');
                        }
                    } catch (error) {
                        reject('翻译失败：' + error.message);
                    }
                },
                onerror: function(error) {
                    reject('网络错误：' + error);
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
        // Discord消息内容通常在这些选择器中
        const contentSelectors = [
            '[class*="messageContent"]',
            '[class*="markup"]',
            '[data-slate-editor="true"]'
        ];
        
        for (const selector of contentSelectors) {
            const contentElement = messageElement.querySelector(selector);
            if (contentElement) {
                // 保留换行和段落结构
                let text = '';
                
                // 处理不同类型的节点
                function extractText(node) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        return node.textContent;
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        const tagName = node.tagName.toLowerCase();
                        
                        // 处理换行标签
                        if (tagName === 'br') {
                            return '\n';
                        }
                        
                        // 处理块级元素，在前后添加换行
                        if (['div', 'p', 'pre', 'blockquote'].includes(tagName)) {
                            let content = '';
                            for (const child of node.childNodes) {
                                content += extractText(child);
                            }
                            return content + '\n';
                        }
                        
                        // 处理代码块
                        if (tagName === 'code' && node.parentElement?.tagName.toLowerCase() === 'pre') {
                            let content = '';
                            for (const child of node.childNodes) {
                                content += extractText(child);
                            }
                            return content;
                        }
                        
                        // 其他元素递归处理
                        let content = '';
                        for (const child of node.childNodes) {
                            content += extractText(child);
                        }
                        return content;
                    }
                    return '';
                }
                
                text = extractText(contentElement);
                
                // 清理多余的换行，但保留段落结构
                text = text.replace(/\n{3,}/g, '\n\n').trim();
                
                return text;
            }
        }
        
        return '';
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
        // Discord消息的选择器
        const messageSelectors = [
            '[class*="message-"]',
            '[class*="messageListItem"]',
            '[id^="chat-messages-"]'
        ];
        
        for (const selector of messageSelectors) {
            const messages = document.querySelectorAll(selector);
            messages.forEach(messageElement => {
                // 检查是否已经添加了按钮
                if (messageElement.querySelector('.discord-translate-btn')) return;
                
                // 检查是否有消息内容
                const hasContent = getMessageText(messageElement).trim().length > 0;
                if (!hasContent) return;
                
                // 找到合适的位置添加按钮
                const headerElement = messageElement.querySelector('[class*="messageHeader"]') || 
                                    messageElement.querySelector('[class*="username"]')?.parentElement;
                
                if (headerElement) {
                    const button = createTranslateButton(messageElement);
                    headerElement.appendChild(button);
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
                
                // 创建设置按钮
                createSettingsButton();
                
                // 初始添加翻译按钮
                setTimeout(() => {
                    addTranslateButtons();
                }, 2000);
                
                // 监听DOM变化，为新消息添加翻译按钮
                const observer = new MutationObserver((mutations) => {
                    let shouldCheck = false;
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            shouldCheck = true;
                        }
                    });
                    
                    if (shouldCheck) {
                        setTimeout(addTranslateButtons, 100);
                    }
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
                
                console.log('Discord翻译助手已加载');
            }
        }, 1000);
    }

    // 启动插件
    init();
})();
