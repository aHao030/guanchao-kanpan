# 第三方来源

## D3 Hierarchy 3.1.2

- 上游：[d3/d3-hierarchy](https://github.com/d3/d3-hierarchy)
- 分发来源：npm `d3-hierarchy@3.1.2`
- 用途：行业、子行业与个股的面积布局；本地文件为 `public/vendor/d3-hierarchy.min.js`。
- Copyright 2010–2021 Mike Bostock；ISC 许可证完整保留在 `public/vendor/d3-hierarchy.LICENSE`。
- 安装开发依赖后，可执行 `npm run vendor` 从固定版本重新生成上述两份分发文件。

## 参考与分析

大盘云图公开页面用于研究结构、文字测量和交互，本产品未复制其网页业务源码或品牌资产。采集的公开脚本及全量 REA 结果不随本产品分发。研究记录与参考截图位于 `docs/reverse-engineering/`。

REA 的源码、MIT 许可证、第三方许可与原始归属保存在独立私有仓库 [aHao030/rea](https://github.com/aHao030/rea)。分析工具与本产品运行时相互独立。

HyperFrames 的 Apache-2.0 源码本轮仅作只读研究，未复制其实现、资产或引入其运行时。具体适用性判断见 `docs/reverse-engineering/hyperframes-review.md`。

## v1.4.0 Web dependencies

React / React DOM / scheduler (Meta, MIT), Ant Design and Ant Design Icons (Ant Group and contributors, MIT), Apache ECharts / zrender (Apache Software Foundation and contributors, Apache-2.0 / BSD-3-Clause as supplied). Exact package versions and transitive dependencies are pinned in package-lock.json.

The bundled copyright notices are preserved in public/workbench.js.LEGAL.txt. Full license and notice files from installed dependencies are preserved in THIRD_PARTY_LICENSES.txt. Design skill sources were read for guidance, not copied into the application runtime; provenance and actual usage are in docs/DESIGN_SKILLS.md.
