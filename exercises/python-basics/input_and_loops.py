"""用輸入與迴圈練習型別轉換及 continue 的安全位置。"""

while True:
    raw_score = input("請輸入 0 到 100 的整數成績：")

    if not raw_score.isdigit():
        print("請輸入整數。")
        continue

    score = int(raw_score)
    if not 0 <= score <= 100:
        print("成績必須介於 0 到 100。")
        continue

    if score >= 90:
        print("優秀")
    elif score >= 60:
        print("及格")
    else:
        print("需要複習")
    break
