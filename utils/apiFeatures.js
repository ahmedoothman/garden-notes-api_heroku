class APIFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }
    filter() {
        //Excluding Fields (Flitering) (Feature 1)
        const queryObj = { ...this.queryString };
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        excludedFields.forEach(el => delete queryObj[el]);
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(
            /\b(gte|gt|lte|lt)\b/g,
            match => `$${match}`
        );
        /*
        we did Flitering because the query we got is like that
        {difficulty: 'easy' , duration:{ gte:'5' }}

        but in mongodb we need the query to be like that
        {difficulty: 'easy' , duration:{ $gte:'5' }}
      */
        this.query.find(JSON.parse(queryStr));
        return this;
    }

    sort() {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            this.query = this.query.sort('-createdAt');
        }
        return this;
    }

    limitFields() {
        if (this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        } else {
            this.query = this.query.select('-__v');
        }
        return this;
    }
    paginate() {
        const page = this.queryString.page * 1 || 1;
        const limit = this.queryString.limit * 1 || 100;
        const skip = (page - 1) * limit;
        this.query = this.query.skip(skip).limit(limit);
        //throw error if the user requested more data than we have
        // if (this.queryString.page) {
        //    const numTours = await Tour.countDocuments();
        //    if (skip >= numTours) throw new Error('this page does not exist');
        // }
        /*
      say we want page 3 with limit 10 result
      page 1 -> 1-10 // page 2 -> 11-20 // page 3 -> 21-30
      so if we want to skip 20 result to start with result 21 as we wanted to get page 3 we need a formula to skip
      skipt formula  =  (page - 1) * limit;
      */
        return this;
    }
}

module.exports = APIFeatures;
