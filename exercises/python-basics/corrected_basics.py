"""對應 Python HackMD 筆記審核後的可執行範例。"""

name = "Kai"
age = 18
average = 92.375

print("Hello", "Python", sep=" / ", end="!\n")
print(f"{name} 今年 {age} 歲，平均分數 {average:.2f}")

balance = 99
price = 66
balance -= price
print(f"餘額：{balance}")
print(f"-1 // 2 = {-1 // 2}")

score = 85
if 90 <= score <= 100:
    grade = "優秀"
elif 60 <= score < 90:
    grade = "及格"
else:
    grade = "需要複習"
print(f"成績結果：{grade}")

numbers = []
for number in range(1, 6):
    numbers.append(number)
print(numbers)

text = "abcdefghijk"
print(text[-1:-5:-1])

payload = "你好".encode("utf-8")
print(payload.decode("utf-8"))
