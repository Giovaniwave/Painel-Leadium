import re

with open('src/components/ClientsView.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Let's handle \r\n to make it robust
original_len = len(code)
has_crlf = '\r\n' in code

if has_crlf:
    code = code.replace('\r\n', '\n')

# Replace first button
target1 = """                            <button
                              onClick={() => handleRecordQuickPayment(c.id, c.name)}
                              disabled={isRecordingPayment}
                              className={`w-full py-2.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                                isDark 
                                  ? 'bg-white text-black hover:bg-gray-200' 
                                  : 'bg-black text-white hover:bg-gray-800'
                              }`}
                              style={{ color: isDark ? '#000000' : '#FFFFFF' }}
                            >"""

replacement1 = """                            <button
                              onClick={() => handleRecordQuickPayment(c.id, c.name)}
                              disabled={isRecordingPayment}
                              className="w-full py-2.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer bg-[#FF4D00] text-white hover:bg-[#e04500]"
                              style={{ color: '#FFFFFF' }}
                            >"""

# Replace second button
target2 = """                                      <button
                                        onClick={() => handleRecordQuickPayment(c.id, c.name)}
                                        disabled={isRecordingPayment}
                                        className={`w-full py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                                          isDark 
                                            ? 'bg-white text-black hover:bg-gray-200' 
                                            : 'bg-black text-white hover:bg-gray-800'
                                        }`}
                                        style={{ color: isDark ? '#000000' : '#FFFFFF' }}
                                      >"""

replacement2 = """                                      <button
                                        onClick={() => handleRecordQuickPayment(c.id, c.name)}
                                        disabled={isRecordingPayment}
                                        className="w-full py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer bg-[#FF4D00] text-white hover:bg-[#e04500]"
                                        style={{ color: '#FFFFFF' }}
                                      >"""

if target1 in code:
    code = code.replace(target1, replacement1)
    print("Successfully replaced first button")
else:
    print("First button not found exactly, trying loose replacement")
    # Let's do a search and replace that doesn't depend on indentation or small spacing
    pattern1 = r'className=\{\s*`w-full\s+py-2\.5\s+rounded-lg\s+text-\[10px\]\s+uppercase\s+font-bold\s+tracking-wider\s+transition-all\s+cursor-pointer\s+\$\{\s*isDark\s*\?\s*\'bg-white\s+text-black\s+hover:bg-gray-200\'\s*:\s*\'bg-black\s+text-white\s+hover:bg-gray-800\'\s*\}\`\s*\}\s*style=\{\{\s*color:\s*isDark\s*\?\s*\'#000000\'\s*:\s*\'#FFFFFF\'\s*\}\}'
    code, count = re.subn(pattern1, 'className="w-full py-2.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer bg-[#FF4D00] text-white hover:bg-[#e04500]" style={{ color: "#FFFFFF" }}', code)
    print(f"Substituted first button count: {count}")

if target2 in code:
    code = code.replace(target2, replacement2)
    print("Successfully replaced second button")
else:
    print("Second button not found exactly, trying loose replacement")
    pattern2 = r'className=\{\s*`w-full\s+py-1\.5\s+rounded\s+text-\[10px\]\s+uppercase\s+font-bold\s+tracking-wider\s+transition-all\s+cursor-pointer\s+\$\{\s*isDark\s*\?\s*\'bg-white\s+text-black\s+hover:bg-gray-200\'\s*:\s*\'bg-black\s+text-white\s+hover:bg-gray-800\'\s*\}\`\s*\}\s*style=\{\{\s*color:\s*isDark\s*\?\s*\'#000000\'\s*:\s*\'#FFFFFF\'\s*\}\}'
    code, count = re.subn(pattern2, 'className="w-full py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer bg-[#FF4D00] text-white hover:bg-[#e04500]" style={{ color: "#FFFFFF" }}', code)
    print(f"Substituted second button count: {count}")

if has_crlf:
    code = code.replace('\n', '\r\n')

with open('src/components/ClientsView.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Replacement complete")
