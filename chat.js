// Real AI Banking Assistant with OpenAI-like responses
// Add OPENAI_API_KEY to .env for production integration

const OpenAI = require('openai'); // npm install openai

class BankingChat {
  constructor() {
    this.context = {};
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  }

  async sendMessage(userId, message) {
    if (!this.context[userId]) this.context[userId] = [];

    this.context[userId].push({ role: 'user', content: message, timestamp: new Date() });

    let response;
    
    // Try real AI first
    if (this.openai) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are CRDB Bank AI assistant. Help with banking: balance, transfer, bills, loans, savings, statements. Be concise, use emojis. Support English/Swahili." },
            ...this.context[userId].slice(-5).map(msg => ({ role: msg.role, content: msg.content }))
          ],
          max_tokens: 150
        });
        response = completion.choices[0].message.content;
      } catch (error) {
        console.error('OpenAI error, fallback to rule-based:', error);
      }
    }

    // Fallback smart rule-based (production-ready without API key)
    if (!response) {
      const lowerMsg = message.toLowerCase();
      response = {
        'balance|saldo': '💳 Check balance: Dashboard → Accounts. API: GET /api/accounts/:id/balance',
        'transfer|tuma': '💸 Transfer: Dashboard → Transfer → Account ID & amount. Max daily limit 5M TZS.',
        'bill|pay|lipa': '⚡ Bills: Select TANESCO/Voda → Meter/Phone → Amount → Confirm (instant!).',
        'loan|mkopo': '🏦 Loans: Apply → Amount, interest, term → Get approval fast!',
        'savings|akiba': '🐷 Savings deposit (>50k gets 2.5% bonus interest!) Goals: /api/savings/goal',
        'statement|rekodi|statementu': '📊 Statements: Accounts → Download (custom date range, PDF ready).',
        'help|msaada|support': 'Available: balance, transfer, bills, loans, savings, statement. *Mkopo, lipa, akiba, tuma.*'
      }[Object.keys(response || {}).find(k => lowerMsg.includes(k.split('|')[0]))] || 
      '🤖 CRDB Assistant here! Try: "balance", "pay bill", "loan", "savings", "help" or "msaada".';
    }

    const aiResponse = { role: 'assistant', content: response, timestamp: new Date() };
    this.context[userId].push(aiResponse);

    if (this.context[userId].length > 10) this.context[userId] = this.context[userId].slice(-10);

    return aiResponse;
  }

  async getHistory(userId, limit = 20) {
    return this.context[userId]?.slice(-limit) || [];
  }

  clearChat(userId) {
    delete this.context[userId];
  }
}

module.exports = new BankingChat();


