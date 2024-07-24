const allResourceTypes = Object.values(
  chrome.declarativeNetRequest.ResourceType
);

const rules = [
  {
    id: 1,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      responseHeaders: [
        {
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          header: 'access-control-allow-origin',
          value: '*'
        },
        {
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          header: 'access-control-allow-headers',
          value: '*'
        }
      ]
    },
    condition: {
      urlFilter: 'https://quotes-gw.webullfintech.com/*',
      resourceTypes: allResourceTypes
    }
  }
];

chrome.declarativeNetRequest.updateDynamicRules({
  removeRuleIds: rules.map((rule) => rule.id),
  addRules: rules
});
