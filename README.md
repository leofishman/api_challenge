# Senior Software Engineer - Code Evaluation

The goal of this project is to create a public API REST that retrieves the market prices for trading pairs. The coding language should be NodeJS, and you're free to implement the solution however you see fit but you should focus on efficiency.

### Problem Specification

- The API should expose only two endpoints:
  - An endpoint that is called with a pair name, and retrieves the tips of the orderbook (considering both amount and price for bid and ask).
  - An endpoint that is called with the pair name, the operation type and the order size, and returns the price to execute the order considering its size (i.e., evaluate [Market Depth]([https://www.investopedia.com/terms/m/marketdepth.asp])).
- The backend should consume data from an external exchange. You could use whatever source you prefer, check orderbook websocket stream from [Bittrex API](https://bittrex.github.io/api/v3) doc or [Bitfinex API](https://docs.bitfinex.com/reference#ws-public-books) doc as references.
- Support only the following trading pairs:
  - BTC-USD
  - ETH-USD
- Focus your solution on performance and precision.
- Submit your solution to a private github repository. Keep the organization of branches and commits as if you were working in a team. Give access to users:
  - fedecaccia
  - ramirocarra
  - juanmavillarrazadb
