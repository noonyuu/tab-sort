document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({}, (tabs) => {
    // グループされていないタブを取得
    const nonGroupedTabs = tabs.filter((tab) => tab.groupId === -1);

    // 並び替えキーを抽出する関数
    const extractSortKey = (tab, sortBy) => {
      // タイトルまたはURLをもとに並び替える
      const source = sortBy === "url" ? tab.url : tab.title || "";
      // アルファベット部分と数字部分、次の数字を分ける
      // 連番のPDFファイルを並び替える場合などに使える
      const match = source.match(/([A-Za-z]+)(\d+)-(\d+)/);

      if (match) {
        return {
          alpha: match[1], // アルファベット部分
          num1: parseInt(match[2], 10), // 最初の数字部分
          num2: parseInt(match[3], 10), // 次の数字部分
        };
      }
      // 数字がない場合は0を返す
      return { alpha: source, num1: 0, num2: 0 };
    };

    // すべてのウィンドウを取得
    chrome.windows.getAll({ populate: true }, (windows) => {
      const windowSelectElement = document.getElementById("windowSelect");

      // ウィンドウ選択UIを作成
      windows.forEach((window, index) => {
        const option = document.createElement("option");
        option.value = window.id;
        // タイトルがない場合は番号を表示
        option.textContent = window.title || `ウィンドウ ${index + 1}`;
        windowSelectElement.appendChild(option);
      });

      // 並び替えボタンの表示を更新
      document.getElementById("tabSort").innerHTML = "タブを並び替える";

      // ボタンをクリックしたら並び替えを実行
      document.getElementById("tabSort").addEventListener("click", async () => {
        // 選択されたウィンドウIDを取得
        const selectedWindowId = parseInt(windowSelectElement.value, 10);
        // 並び替えルールを取得
        const sortRule = document.getElementById("sortRule").value;

        const sortedTabs = nonGroupedTabs.slice().sort((a, b) => {
          const keyA = extractSortKey(a, sortRule);
          const keyB = extractSortKey(b, sortRule);

          // アルファベット順で比較
          // localeCompare → 文字列の比較 
          const alphaComparison = keyA.alpha.localeCompare(keyB.alpha);
          if (alphaComparison !== 0) return alphaComparison;

          // 数字順で比較
          if (keyA.num1 !== keyB.num1) return keyA.num1 - keyB.num1;
          return keyA.num2 - keyB.num2;
        });

        const selectedWindow = windows.find((window) => window.id === selectedWindowId);

        if (selectedWindow) {
          const currentWindowId = selectedWindow.id;
          let lastIndex = 0; // グループ外のタブを並び替えるインデックス基準

          // タブを並び替える
          for (let newIndex = 0; newIndex < sortedTabs.length; newIndex++) {
            const tab = sortedTabs[newIndex];

            // 同じウィンドウ内でのみタブを移動
            if (tab.windowId === currentWindowId) {
              // グループ外タブのインデックスを保持しながら移動
              await chrome.tabs.move(tab.id, { index: lastIndex });
              lastIndex++; // 次のタブを並べる場所を更新
            }
          }

          // 完了後に拡張を閉じる
          window.close();
        }
      });
    });
  });
});
