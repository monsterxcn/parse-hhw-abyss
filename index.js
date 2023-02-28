const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment');
const fs = require('fs');

const BASEURL = "https://genshin.honeyhunterworld.com"
const HHW_LANG = process.env.HHW_LANG
const HEADERS = {
    params: { lang: HHW_LANG ? HHW_LANG : 'EN' },
    timeout: 60000,
    headers: {
        "accept": "text/html",
        "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Mobile Safari/537.36"
    },
    // proxy: {
    //     protocol: 'http',
    //     host: '127.0.0.1',
    //     port: 7890,
    // }
}

fetchData()

function fetchData() {
    // 请求 Genshin Honey Hunter World
    axios.get(new URL('/d_1001/', BASEURL), HEADERS).then((betaResp) => {
        const latestLiveUrl = getLatestLive(betaResp.data)
        axios.get(latestLiveUrl, HEADERS).then((liveResp) => {
            extractData(liveResp.data, "Latest Live")
        }).catch((err) => {
            console.error("解析 Last Live 深渊数据出错")
            console.error(err)
            process.exit(1)
        }).then(() => {
            bestResult()
        }).catch((err) => {
            console.error("处理最优深渊数据出错")
            console.error(err)
            process.exit(1)
        })
    }).catch((err) => {
        console.error("解析 Last Beta 深渊数据出错")
        console.error(err)
        process.exit(1)
    })
}

function bestResult() {
    // 判断 Last Beta 深渊数据的所有时间节点是否全部正确
    // Last Beta 深渊数据存在异常的时间节点则使用 Last Live 深渊数据
    const betaContent = fs.readFileSync("assets/abyss.beta.json", 'utf-8')
    const liveContent = fs.readFileSync("assets/abyss.live.json", 'utf-8')
    const betaData = JSON.parse(betaContent)
    const LiveData = JSON.parse(liveContent)

    const betaDateKeys = Object.keys(betaData.Schedule).reverse()
    const timeFormat = 'YYYY-MM-DD HH:mm:ss'
    let startTime = moment('2020-07-16 04:00:00', timeFormat);
    const isValid = betaDateKeys.every((key, i) => {
        if (i === 0) {
            return key === "2020-07-01 00:00:00"
        }
        const thisTime = startTime.format(timeFormat)
        if (startTime.date() === 1) {
            // 当前 key 为某月 1 日，将 startTime 向后推迟 15 天到当月 16 日
            startTime = startTime.add(15, 'days')
        } else {
            // 当前 key 为某月 16 日，将 startTime 向后推迟直到下月 1 日
            startTime = startTime.endOf('month').add(1, 'days').set('hour', 4).set('minute', 0).set('second', 0)
        }
        return key === thisTime
    })
    result = isValid ? betaData : LiveData
    fs.writeFileSync('assets/abyss.json', JSON.stringify(result));
    fs.writeFileSync('assets/abyss.beautify.json', JSON.stringify(result, null, 2));
}

function getLatestLive(htmlStr) {
    extractData(htmlStr, "Latest Beta")

    const $ = cheerio.load(htmlStr)
    const options = $('div.version_select > select.version_selector > option')

    const latestLiveParams = options.filter(function () {
        return $(this).text() === "Latest Live"
    }).attr("value")

    return new URL('/d_1001/' + latestLiveParams, BASEURL)
}

function extractData(htmlStr, pageType) {
    console.log(`===============\n  ${pageType}  \n===============`)
    const data = { "Floor": {}, "Schedule": {} }
    const $ = cheerio.load(htmlStr)

    const floors = $('#abyss_floors > div > div > section')
    console.assert(floors.length === 13);

    // 获取 Variant 表格元素
    const tables = floors.slice(0, 12).find('div.scroll_wrap > table > tbody')
    // 每个 Variant 包含一个层通用数据表格、三个间数据表格
    console.assert(tables.length % 4 === 0)
    // 每 4 个表格分割至一组
    const variants = []
    for (var i = 0; i < tables.length; i += 4) {
        variants.push(tables.slice(i, i + 4))
    }

    // 遍历解析 Variant
    variants.map(function (tableGroup) {
        // 解析 Floor ID
        findFloorSection = tableGroup.closest('section.tab-panel-2')
        console.assert(findFloorSection.length === 1)
        const fId = /Floor \#(\d*)/gm.exec(findFloorSection[0].attribs.id)[1]

        // 解析 Variant ID
        findVariantSection = tableGroup.closest('section.tab-panel-3')
        console.assert(findVariantSection.length === 1)
        const vId = /Variant \#(\d*)/gm.exec(findVariantSection[0].attribs.id)[1]

        console.log(fId, vId)
        const vData = {}
        const commonTable = tableGroup.eq(0)
        const chamberTables = tableGroup.slice(1, 4)

        // 解析层通用数据表格
        const commonRows = commonTable.children('tr')
        console.assert(commonRows.length === 5)
        commonRows.map(function (rowIdx) {
            const tagTds = $(this).children('td')
            const key = tagTds.eq(-2).text().replace(/(\s|\(|\))/g, "")
            const _value = tagTds.eq(-1)
            if (rowIdx === 0) {
                // 第一行共三列，其中第一列为该层图像
                const vImgElem = tagTds.children('img')[0]
                vData["Icon"] = BASEURL + vImgElem.attribs.src
            }
            if (key === "Unlock") {
                // 渊星总数，提取为 number
                value = /⭐x(\d*)/gm.exec(_value.text())[1] * 1
            } else if (key === "Disorders") {
                // 地脉异常，替换 <br> 标签
                value = _value.html().split('<br><br>')
            } else if (key === "Reward") {
                // 星之秘宝，解析嵌套表格
                value = []
                const rewardRows = _value.children('table').children('tbody').children('tr')
                console.assert(rewardRows.length === 3)
                rewardRows.map(function () {
                    const starText = $(this).children('td').eq(0).text()
                    const rewardLoaded = $(this).children('td').eq(-1)
                    // const needStarCount = /⭐x(\d*)/gm.exec(starText)[1]
                    const _reward = []
                    rewardLoaded.children('a').map(function () {
                        const iconDivLoaded = $(this).children('div')
                        const iconImgElem = iconDivLoaded.children('img')[0]
                        _reward.push({
                            'Icon': BASEURL + iconImgElem.attribs.src,
                            'Id': /i_(\d*)/gm.exec(iconDivLoaded[0].parent.attribs.href)[1] * 1,
                            'Rarity': /rar_bg_(\d)/gm.exec(iconDivLoaded[0].attribs.class)[1] * 1,
                            'Name': iconImgElem.attribs.alt,
                            'Count': $(this).text() * 1,
                        })
                    })
                    value.push(_reward)
                })
            } else {
                // 其余数据先尝试转为 number 再写入
                value = (_value.text() * 1) ? (_value.text() * 1) : _value.text()
            }
            // 写入层通用数据的一对键值
            vData[key] = value
        })

        // 解析间数据表格
        vData['Chambers'] = []
        chamberTables.map(function () {
            const cData = {}
            $(this).children('tr').map(function () {
                const tagTds = $(this).children('td')
                const _key = tagTds.eq(0).text().replace(/(\s|\(|\)|\#)/g, "")
                const _value = tagTds.eq(-1)
                if (_key === 'Conditions') {
                    // 挑战目标，解析嵌套表格
                    key = _key
                    value = []
                    const conditionRows = _value.children('table').children('tbody').children('tr')
                    console.assert(conditionRows.length === 3)
                    conditionRows.map(function () {
                        value.push($(this).children('td').eq(-1).text())
                    })
                } else if (_key.startsWith('PossibleBuff')) {
                    // 深秘祝福，解析嵌套表格
                    key = "PossibleBuff"
                    // const innerKey = /PossibleBuff(\d)/gm.exec(_key)[1]
                    const innerValue = []
                    const buffRows = _value.children('table').children('tbody').children('tr')
                    buffRows.map(function () {
                        const buffTds = $(this).children('td')
                        const buffText = buffTds.eq(-1).text()
                        const buffRegex = /(.*) \((Single Chamber|Whole Floor)\)/gm
                        const regMatched = buffRegex.exec(buffText)
                        const iconImgElem = buffTds.eq(0).children('img')[0]
                        innerValue.push({
                            'Icon': BASEURL + iconImgElem.attribs.src,
                            'Buff': regMatched[1],
                            'Time': regMatched[2],
                        })
                    })
                    cData[key] = cData[key] ? cData[key] : []
                    cData[key].push(innerValue)
                    return
                } else if (_key.startsWith('Monsters')) {
                    // 讨伐列表，解析嵌套表格
                    key = "Monsters"
                    const innerKey = /Monsters(\w*)/gm.exec(_key)[1]
                    const innerValue = []
                    _value.children('a').map(function (_, aElem) {
                        const iconDivLoaded = $(this).children('div')
                        const iconImgElem = iconDivLoaded.children('img')[0]
                        innerValue.push({
                            'Icon': BASEURL + iconImgElem.attribs.src,
                            'Id': /m_(\d*)/gm.exec(aElem.attribs.href)[1] * 1,
                            'Rarity': /rar_bg_(.*)/gm.exec(iconDivLoaded[0].attribs.class)[1] * 1,
                            'Name': $(this).next().text(),
                        })
                    })
                    cData[key] = cData[key] ? cData[key] : {}
                    cData[key][innerKey] = innerValue
                    return
                } else if (_key === 'Reward') {
                    // 间之秘宝，解析嵌套表格
                    key = _key
                    value = []
                    _value.children('a').map(function (_, aElem) {
                        const iconDivLoaded = $(this).children('div')
                        const iconImgElem = iconDivLoaded.children('img')[0]
                        value.push({
                            'Icon': BASEURL + iconImgElem.attribs.src,
                            'Id': /i_(\d*)/gm.exec(aElem.attribs.href)[1] * 1,
                            'Rarity': /rar_bg_(.*)/gm.exec(iconDivLoaded[0].attribs.class)[1] * 1,
                            'Name': iconImgElem.attribs.alt,
                            'Count': $(this).text() * 1,
                        })
                    })
                } else {
                    key = _key
                    value = (_value.text() * 1) ? (_value.text() * 1) : _value.text()
                }
                // 写入间数据的一对键值
                cData[key] = value
            })
            // 压入层数据的间数据
            vData['Chambers'].push(cData)
        })

        // 解析完毕填入 data
        data["Floor"][fId] = data["Floor"][fId] ? data["Floor"][fId] : {}
        data["Floor"][fId][vId] = vData
    })

    // 获取 Floor Schedule 表格元素
    const schedule = floors.eq(-1).children("div.menu_item_scrollable").children('table')
    // 获取 Blessings 表格元素
    const blessing = $('section#abyss_blessing > div.menu_item_scrollable > table');
    console.assert(schedule.length === blessing.length)

    // 遍历解析 Floor Schedule & Blessings
    schedule.map(function (sIdx) {
        const time = $(this).eq(0).parent().prev().text()
        console.log(time)

        // 解析 Floor Variant 安排数据
        const scheduleRows = $(this).children('tbody').children('tr')
        const arrangeData = {}
        scheduleRows.map(function () {
            const arrangement = $(this).children('td')
            const fIdx = /Floor \#(\d*)/gm.exec(arrangement.eq(0).text())[1]
            const vIdx = /Variant \#(\d*)/gm.exec(arrangement.eq(-1).text())[1]
            arrangeData[fIdx] = vIdx
        })

        // 解析渊月祝福数据，根据 sIdx 寻找
        const blessTableLoaded = blessing.eq(sIdx).children('tbody')
        console.assert(blessTableLoaded.parent().parent().prev().text() === time)
        const blessTagTds = blessTableLoaded.children('tr').children('td')
        console.assert(blessTagTds.length === 3)
        const blessData = {
            'Icon': BASEURL + blessTagTds.children('img')[0].attribs.src,
            'Name': blessTagTds.eq(1).text(),
            'Detail': blessTagTds.eq(2).text(),
            'ColorfulDetail': blessTagTds.eq(2).html(),
        }

        // 解析完毕填入 data
        data["Schedule"][time] = { 'arrangement': arrangeData, 'blessing': blessData }
    })

    // 生成 JSON 文件
    data["Type"] = pageType
    fileName = `abyss.${pageType.split(" ")[1].toLowerCase()}.json`
    // fs.writeFileSync('assets/abyss.beautify.json', JSON.stringify(data, null, 2));
    fs.writeFileSync(`assets/${fileName}`, JSON.stringify(data, null));
}