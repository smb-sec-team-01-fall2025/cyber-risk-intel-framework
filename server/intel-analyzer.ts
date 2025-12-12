import OpenAI from "openai";

// Using Replit AI Integrations for OpenAI access (charges billed to Replit credits)
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

interface IntelAnalysis {
  severity: number; // 1-5 scale
  description: string; // Brief summary
}

export class IntelAnalyzer {
  async analyzeIntelEvent(
    source: string,
    indicator: string,
    rawData: any
  ): Promise<IntelAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(source, indicator, rawData);
      
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        // Note: gpt-5-mini only supports default temperature (1)
        messages: [
          {
            role: "system",
            content: `You are an expert threat intelligence analyst specializing in OSINT data analysis. 
Analyze threat intelligence data and provide:
1. Severity assessment (1-5 scale where 1=informational, 2=low, 3=medium, 4=high, 5=critical)
2. Brief description summarizing the threat

Severity Guidelines:
- 5 (Critical): Active exploitation, known malicious infrastructure, high abuse score (>75%), critical vulnerabilities
- 4 (High): Suspicious activity, moderate abuse score (50-75%), recent malicious reports, exposed services with known vulns
- 3 (Medium): Some suspicious indicators, low abuse score (25-50%), scanning activity, exposed non-critical services
- 2 (Low): Minor concerns, minimal abuse score (1-25%), informational findings
- 1 (Informational): No threats detected, clean reputation, normal internet presence

Respond ONLY with valid JSON in this format:
{
  "severity": <number 1-5>,
  "description": "<brief 1-2 sentence summary>"
}`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      const parsed = JSON.parse(content);
      
      return {
        severity: Math.max(1, Math.min(5, parsed.severity || 1)),
        description: parsed.description || "Threat intelligence event detected.",
      };
    } catch (error) {
      console.error("[IntelAnalyzer] Error analyzing intel event:", error);
      
      return {
        severity: 1,
        description: `${source} intelligence event for indicator ${indicator}`,
      };
    }
  }

  private buildAnalysisPrompt(
    source: string,
    indicator: string,
    rawData: any
  ): string {
    let prompt = `Analyze this ${source.toUpperCase()} threat intelligence data:\n\n`;
    prompt += `Indicator: ${indicator}\n`;
    prompt += `Source: ${source}\n\n`;

    if (source === "abuseipdb") {
      const data = rawData?.data;
      if (data) {
        prompt += `AbuseIPDB Report:\n`;
        prompt += `- Abuse Confidence Score: ${data.abuseConfidenceScore || 0}%\n`;
        prompt += `- Total Reports: ${data.totalReports || 0}\n`;
        prompt += `- Distinct Users Reporting: ${data.numDistinctUsers || 0}\n`;
        prompt += `- Last Reported: ${data.lastReportedAt || "N/A"}\n`;
        prompt += `- Country: ${data.countryName || data.countryCode || "Unknown"}\n`;
        prompt += `- ISP: ${data.isp || "Unknown"}\n`;
        prompt += `- Domain: ${data.domain || "Unknown"}\n`;
        prompt += `- Usage Type: ${data.usageType || "Unknown"}\n`;
        prompt += `- Is Whitelisted: ${data.isWhitelisted ? "Yes" : "No"}\n`;
        
        if (data.reports && data.reports.length > 0) {
          prompt += `\nRecent Reports:\n`;
          data.reports.slice(0, 3).forEach((report: any, idx: number) => {
            prompt += `  ${idx + 1}. Categories: ${report.categories?.join(", ") || "None"}\n`;
            prompt += `     Comment: ${report.comment?.slice(0, 100) || "No comment"}\n`;
          });
        }
      }
    } else if (source === "otx") {
      if (rawData.pulse_info) {
        prompt += `OTX (AlienVault) Report:\n`;
        prompt += `- Total Pulses: ${rawData.pulse_info.count || 0}\n`;
        
        if (rawData.pulse_info.pulses && rawData.pulse_info.pulses.length > 0) {
          prompt += `\nTop Pulses:\n`;
          rawData.pulse_info.pulses.slice(0, 3).forEach((pulse: any, idx: number) => {
            prompt += `  ${idx + 1}. ${pulse.name || "Unnamed"}\n`;
            prompt += `     Created: ${pulse.created || "Unknown"}\n`;
            prompt += `     Tags: ${pulse.tags?.join(", ") || "None"}\n`;
            if (pulse.description) {
              prompt += `     Description: ${pulse.description.slice(0, 150)}...\n`;
            }
          });
        }
      }
    } else if (source === "shodan") {
      prompt += `Shodan Report:\n`;
      prompt += `- Organization: ${rawData.org || "Unknown"}\n`;
      prompt += `- ISP: ${rawData.isp || "Unknown"}\n`;
      prompt += `- Country: ${rawData.country_name || rawData.country_code || "Unknown"}\n`;
      prompt += `- Open Ports: ${rawData.ports?.join(", ") || "None"}\n`;
      
      if (rawData.vulns && Object.keys(rawData.vulns).length > 0) {
        prompt += `- Vulnerabilities: ${Object.keys(rawData.vulns).join(", ")}\n`;
      }
      
      if (rawData.data && rawData.data.length > 0) {
        prompt += `\nExposed Services:\n`;
        rawData.data.slice(0, 3).forEach((service: any, idx: number) => {
          prompt += `  ${idx + 1}. Port ${service.port}: ${service.product || service._shodan?.module || "Unknown"}\n`;
          if (service.version) {
            prompt += `     Version: ${service.version}\n`;
          }
        });
      }
    } else {
      prompt += `Raw Data:\n${JSON.stringify(rawData, null, 2).slice(0, 1000)}\n`;
    }

    prompt += `\nProvide severity assessment (1-5) and brief description.`;
    
    return prompt;
  }
}

export const intelAnalyzer = new IntelAnalyzer();
